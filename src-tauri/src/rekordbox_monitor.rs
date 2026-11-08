use crate::rekordbox::{
    self as bridge, LibrarySnapshot, Ownership, RekordboxStatus, SyncRequest, SyncState,
};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Default)]
pub struct Monitor {
    snapshot: Mutex<Option<RekordboxStatus>>,
    refresh: AtomicBool,
}

impl Monitor {
    pub fn get(&self, refresh: bool) -> Option<RekordboxStatus> {
        if refresh {
            self.refresh.store(true, Ordering::Release);
        }
        self.snapshot.lock().ok()?.clone()
    }

    fn publish(&self, app: &AppHandle, status: RekordboxStatus) {
        if let Ok(mut snapshot) = self.snapshot.lock() {
            *snapshot = Some(status.clone());
        }
        let _ = app.emit("rekordbox://updated", status);
    }
}

// Watch the directory because SQLite rotates its journals.
// SHM changes alone are ignored so opening a reader cannot trigger a read loop.
fn relevant(path: &Path, database: &Path) -> bool {
    let Some(name) = database.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|file| {
            file == name
                || file == format!("{name}-wal")
                || file == format!("{name}-journal")
                || file == "masterPlaylists6.xml"
        })
}

fn watch(database: &Path, generation: Arc<AtomicU64>) -> notify::Result<RecommendedWatcher> {
    let watched = database.to_path_buf();
    let mut watcher = notify::recommended_watcher(move |event: notify::Result<notify::Event>| {
        let changed = match event {
            Ok(event) => {
                event.need_rescan()
                    || (!matches!(event.kind, notify::EventKind::Access(_))
                        && event.paths.iter().any(|path| relevant(path, &watched)))
            }
            Err(_) => true, // A lost notification requires a full rescan.
        };
        if changed {
            generation.fetch_add(1, Ordering::Release);
        }
    })?;
    watcher.watch(
        database.parent().unwrap_or(database),
        RecursiveMode::NonRecursive,
    )?;
    Ok(watcher)
}

fn needs_sync(
    snapshot: &LibrarySnapshot,
    desired: &BTreeMap<String, BTreeSet<String>>,
    owner: &Ownership,
) -> bool {
    if desired.is_empty() && owner.playlists.is_empty() {
        return false;
    }
    if let Some(id) = owner.folder_id.as_deref() {
        if !snapshot
            .playlists
            .iter()
            .any(|folder| folder.id == id && folder.name == "Cue" && folder.parent_id == "root")
        {
            return true;
        }
    }
    let folder = owner.folder_id.as_deref().or_else(|| {
        snapshot
            .playlists
            .iter()
            .find(|playlist| playlist.parent_id == "root" && playlist.name == "Cue")
            .map(|playlist| playlist.id.as_str())
    });
    // Owned playlists must also be visited when their tag has disappeared.
    for tag in desired.keys().chain(owner.playlists.keys()) {
        let Some(target) = desired.get(tag) else {
            return true;
        };
        let id = owner
            .playlists
            .get(tag)
            .map(|playlist| playlist.id.as_str())
            .or_else(|| {
                snapshot
                    .playlists
                    .iter()
                    .find(|playlist| {
                        Some(playlist.parent_id.as_str()) == folder && playlist.name == *tag
                    })
                    .map(|playlist| playlist.id.as_str())
            });
        let Some(id) = id else {
            return true;
        };
        // Let the library reject moved, renamed, or ambiguous playlists.
        if !snapshot.playlists.iter().any(|playlist| {
            playlist.id == id
                && Some(playlist.parent_id.as_str()) == folder
                && playlist.name == *tag
        }) {
            return true;
        }
        let members: Vec<_> = snapshot
            .memberships
            .iter()
            .filter(|entry| entry.playlist_id == id)
            .map(|entry| entry.content_id.clone())
            .collect();
        let unique: BTreeSet<_> = members.iter().cloned().collect();
        if unique != *target || unique.len() != members.len() || !owner.playlists.contains_key(tag)
        {
            return true;
        }
    }
    false
}

fn can_write(
    pending: bool,
    snapshot_running: bool,
    process_running: Option<bool>,
    quiet: bool,
) -> bool {
    pending && !snapshot_running && process_running == Some(false) && quiet
}

struct RefreshSchedule {
    observed: u64,
    changed_at: Instant,
    last_read: Instant,
    running: Option<bool>,
    fingerprint: Option<(String, u64)>,
    retry_after: Option<Instant>,
    pending_deferred: bool,
}

impl RefreshSchedule {
    fn new(now: Instant) -> Self {
        Self {
            observed: 0,
            changed_at: now,
            last_read: now - Duration::from_secs(30),
            running: None,
            fingerprint: None,
            retry_after: None,
            pending_deferred: false,
        }
    }

    fn observe(&mut self, generation: u64, now: Instant) {
        if generation != self.observed {
            self.changed_at = now;
            self.observed = generation;
        }
    }

    fn quiet(&self, now: Instant) -> bool {
        now.duration_since(self.changed_at) >= Duration::from_secs(2)
    }

    fn due(
        &self,
        now: Instant,
        requested: bool,
        fingerprint: &(String, u64),
        running: Option<bool>,
    ) -> bool {
        if requested {
            return true;
        }
        if self.retry_after.is_some_and(|deadline| now < deadline) {
            return false;
        }
        self.fingerprint.as_ref() != Some(fingerprint)
            || self.running != running
            || now.duration_since(self.last_read) >= Duration::from_secs(30)
            || (self.observed != 0 && self.last_read < self.changed_at && self.quiet(now))
            || (self.pending_deferred && self.quiet(now))
            || self.retry_after.is_some()
    }

    fn started(&mut self, now: Instant, fingerprint: (String, u64), running: Option<bool>) {
        self.last_read = now;
        self.fingerprint = Some(fingerprint);
        self.running = running;
        self.retry_after = None;
        self.pending_deferred = false;
    }

    fn failed(&mut self, now: Instant) {
        self.retry_after = Some(now + Duration::from_secs(30));
    }

    fn defer_pending(&mut self) {
        self.pending_deferred = true;
    }
}

fn unavailable_status(running: Option<bool>, error: String) -> RekordboxStatus {
    RekordboxStatus {
        supported: true,
        available: false,
        running: running.unwrap_or(true),
        database_path: None,
        checked_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        error: Some(error.clone()),
        tracks: Vec::new(),
        sync_state: SyncState::Error,
        sync_error: Some(error),
        watching: false,
    }
}

pub fn start(app: AppHandle) {
    if !bridge::supported() {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let generation = Arc::new(AtomicU64::new(0));
        let mut watcher = None;
        let mut watched_path = PathBuf::new();
        let mut schedule = RefreshSchedule::new(Instant::now());
        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;
            let monitor = app.state::<Monitor>();
            let db = app
                .state::<crate::db::DbState>()
                .lock()
                .ok()
                .and_then(|db| db.clone());
            let Some(db) = db else {
                continue;
            };
            // Cheap change check; songs are loaded only when a read is due.
            let fingerprint = (db.library_path.clone(), crate::db::revision());
            let now = Instant::now();
            schedule.observe(generation.load(Ordering::Acquire), now);
            let quiet = schedule.quiet(now);
            let running = tauri::async_runtime::spawn_blocking(bridge::is_running)
                .await
                .ok()
                .and_then(Result::ok);
            let requested = monitor.refresh.swap(false, Ordering::AcqRel);
            // Poll periodically even if native notifications are lost.
            if !schedule.due(now, requested, &fingerprint, running) {
                continue;
            }
            schedule.started(now, fingerprint, running);
            let result = async {
                let songs = db.get_songs().await?;
                let snapshot = tauri::async_runtime::spawn_blocking(bridge::read_library).await??;
                if watched_path != Path::new(&snapshot.database_path) || watcher.is_none() {
                    watched_path = PathBuf::from(&snapshot.database_path);
                    watcher = watch(&watched_path, generation.clone()).ok();
                }
                let matches =
                    bridge::match_tracks(&songs, Path::new(&db.library_path), &snapshot.tracks);
                let desired = bridge::playlist_memberships(&songs, &matches);
                let owner = bridge::load_ownership(&db, &snapshot.database_path).await?;
                let pending = needs_sync(&snapshot, &desired, &owner);
                let mut status = RekordboxStatus {
                    supported: true,
                    available: true,
                    running: snapshot.rekordbox_running,
                    database_path: Some(snapshot.database_path.clone()),
                    checked_at: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    error: None,
                    tracks: matches,
                    sync_state: if pending {
                        SyncState::Pending
                    } else {
                        SyncState::Synced
                    },
                    sync_error: None,
                    watching: watcher.is_some(),
                };
                // A quiet period is only a debounce, not a safety guarantee.
                // rbox retains responsibility for database writes and their safeguards.
                if can_write(pending, status.running, running, quiet) {
                    status.sync_state = SyncState::Syncing;
                    monitor.publish(&app, status.clone());
                    let request = SyncRequest {
                        database_path: snapshot.database_path,
                        sync_directory: app.path().app_data_dir()?.join("rekordbox"),
                        ownership: owner,
                        playlists: desired,
                    };
                    match bridge::sync(&db, request).await {
                        Ok(()) => status.sync_state = SyncState::Synced,
                        Err(error) => {
                            status.sync_state = SyncState::Error;
                            status.sync_error = Some(format!("{error:#}"));
                            schedule.failed(Instant::now());
                        }
                    }
                }
                // Keep pending work eligible after the debounce, even without
                // another event or a process-state transition.
                if pending && !status.running && !quiet {
                    schedule.defer_pending();
                }
                monitor.publish(&app, status);
                Ok::<(), anyhow::Error>(())
            }
            .await;
            if let Err(error) = result {
                schedule.failed(Instant::now());
                watcher = None;
                watched_path.clear();
                let status = unavailable_status(running, format!("{error:#}"));
                monitor.publish(&app, status);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn writes_wait_for_both_closed_checks_and_a_quiet_period() {
        assert!(can_write(true, false, Some(false), true));
        assert!(!can_write(false, false, Some(false), true));
        assert!(!can_write(true, true, Some(false), true));
        assert!(!can_write(true, false, Some(true), true));
        assert!(!can_write(true, false, None, true));
        assert!(!can_write(true, false, Some(false), false));
    }
    #[test]
    fn schedule_debounces_changes_retries_failures_and_allows_manual_recovery() {
        let now = Instant::now();
        let fingerprint = ("library".into(), 0);
        let mut schedule = RefreshSchedule::new(now);
        assert!(schedule.due(now, false, &fingerprint, Some(false)));
        schedule.started(now, fingerprint.clone(), Some(false));
        assert!(!schedule.due(now, false, &fingerprint, Some(false)));
        schedule.observe(1, now + Duration::from_secs(1));
        assert!(!schedule.due(
            now + Duration::from_secs(2),
            false,
            &fingerprint,
            Some(false)
        ));
        assert!(schedule.due(
            now + Duration::from_secs(3),
            false,
            &fingerprint,
            Some(false)
        ));
        schedule.started(
            now + Duration::from_secs(3),
            fingerprint.clone(),
            Some(false),
        );
        schedule.failed(now + Duration::from_secs(3));
        assert!(!schedule.due(
            now + Duration::from_secs(4),
            false,
            &fingerprint,
            Some(true)
        ));
        assert!(schedule.due(
            now + Duration::from_secs(4),
            true,
            &fingerprint,
            Some(false)
        ));
        assert!(schedule.due(
            now + Duration::from_secs(33),
            false,
            &fingerprint,
            Some(false)
        ));
        // A successful manual retry clears the prior backoff.
        schedule.started(
            now + Duration::from_secs(4),
            fingerprint.clone(),
            Some(false),
        );
        let changed = ("library".into(), 1);
        assert!(schedule.due(now + Duration::from_secs(5), false, &changed, Some(false)));
    }

    #[test]
    fn pending_work_survives_debounce_and_polling_recovers_lost_events() {
        let now = Instant::now();
        let fingerprint = ("library".into(), 0);
        let mut schedule = RefreshSchedule::new(now);
        schedule.started(now, fingerprint.clone(), Some(false));
        schedule.defer_pending();
        // Startup may have no file event at all; pending work must still resume.
        assert!(!schedule.due(
            now + Duration::from_secs(1),
            false,
            &fingerprint,
            Some(false)
        ));
        assert!(schedule.due(
            now + Duration::from_secs(2),
            false,
            &fingerprint,
            Some(false)
        ));
        schedule.started(
            now + Duration::from_secs(2),
            fingerprint.clone(),
            Some(false),
        );
        assert!(schedule.due(
            now + Duration::from_secs(32),
            false,
            &fingerprint,
            Some(false)
        ));
    }

    #[test]
    fn failed_reads_invalidate_connection_metadata() {
        let status = unavailable_status(Some(false), "Drive disconnected".into());
        assert!(!status.available && !status.watching);
        assert!(status.tracks.is_empty() && status.database_path.is_none());
        assert_eq!(status.error.as_deref(), Some("Drive disconnected"));
        assert_eq!(status.sync_state, SyncState::Error);
    }

    fn snapshot() -> LibrarySnapshot {
        serde_json::from_value(serde_json::json!({"database_path":"master.db","rekordbox_running":false,"tracks":[],"playlists":[{"id":"folder","name":"Cue","parent_id":"root"},{"id":"list","name":"house","parent_id":"folder"}],"memberships":[{"playlist_id":"list","content_id":"a"}]})).unwrap()
    }
    fn owner() -> Ownership {
        serde_json::from_value(
            serde_json::json!({"folder_id":"folder","playlists":{"house":{"id":"list"}}}),
        )
        .unwrap()
    }
    #[test]
    fn detects_adoption_manual_changes_duplicates_and_removed_tags() {
        let desired = BTreeMap::from([("house".into(), BTreeSet::from(["a".into()]))]);
        let mut library = snapshot();
        assert!(!needs_sync(&library, &desired, &owner()));
        assert!(needs_sync(&library, &desired, &Ownership::default()));
        assert!(needs_sync(&library, &BTreeMap::new(), &owner()));
        library.memberships.push(cue_rekordbox::Membership {
            id: String::new(),
            playlist_id: "list".into(),
            content_id: "a".into(),
        });
        assert!(needs_sync(&library, &desired, &owner()));
        library.memberships.last_mut().unwrap().content_id = "manual".into();
        assert!(needs_sync(&library, &desired, &owner()));
        let mut moved = snapshot();
        moved.playlists[0].name = "Elsewhere".into();
        assert!(needs_sync(&moved, &desired, &owner()));
    }
    #[test]
    fn ignores_unrelated_playlists_and_reader_bookkeeping() {
        assert!(!needs_sync(
            &snapshot(),
            &BTreeMap::new(),
            &Ownership::default()
        ));
        let database = Path::new("library/master.db");
        for name in [
            "master.db",
            "master.db-wal",
            "master.db-journal",
            "masterPlaylists6.xml",
        ] {
            assert!(relevant(&Path::new("library").join(name), database));
        }
        for name in ["master.db-shm", "other.db", "ownership.json"] {
            assert!(!relevant(&Path::new("library").join(name), database));
        }
    }
    #[test]
    fn native_watcher_observes_database_replacement() {
        let directory = tempfile::tempdir().unwrap();
        let database = directory.path().join("master.db");
        std::fs::write(&database, b"before").unwrap();
        let generation = Arc::new(AtomicU64::new(0));
        let _watcher = watch(&database, generation.clone()).unwrap();
        let replacement = tempfile::NamedTempFile::new_in(directory.path()).unwrap();
        std::fs::write(replacement.path(), b"after").unwrap();
        replacement.persist(&database).unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while generation.load(Ordering::Acquire) == 0 && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        assert!(generation.load(Ordering::Acquire) > 0);
    }
}
