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

// Watch the directory: SQLite rotates journals and Cue replaces the database.
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

pub fn start(app: AppHandle) {
    if !bridge::supported() {
        return;
    }
    tauri::async_runtime::spawn(async move {
        let generation = Arc::new(AtomicU64::new(0));
        let mut watcher = None;
        let mut watched_path = PathBuf::new();
        let mut observed = 0;
        let mut changed_at = Instant::now();
        let mut last_read = Instant::now() - Duration::from_secs(30);
        let mut last_running = None;
        let mut cue_fingerprint = None;
        let mut retry_after = Instant::now();
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
            let current = generation.load(Ordering::Acquire);
            if current != observed {
                changed_at = Instant::now();
                observed = current;
            }
            let quiet = changed_at.elapsed() >= Duration::from_secs(2);
            let running = tauri::async_runtime::spawn_blocking(bridge::is_running)
                .await
                .ok()
                .and_then(Result::ok);
            let requested = monitor.refresh.swap(false, Ordering::AcqRel);
            let cue_changed = cue_fingerprint.as_ref() != Some(&fingerprint);
            let process_changed = running != last_running;
            // Reconcile periodically as well: OS notifications can be lost, and
            // unsupported/network volumes may need the polling fallback.
            let stale = last_read.elapsed() >= Duration::from_secs(30);
            let file_changed = current != 0 && last_read < changed_at;
            if !(requested || cue_changed || process_changed || stale || (file_changed && quiet)) {
                continue;
            }
            if !requested && Instant::now() < retry_after {
                continue;
            }
            last_running = running;
            cue_fingerprint = Some(fingerprint);
            last_read = Instant::now();
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
                // A quiet period is only a debounce, not a safety guarantee. The
                // library independently rechecks the process, journals and hashes.
                if can_write(pending, status.running, running, quiet) {
                    status.sync_state = SyncState::Syncing;
                    monitor.publish(&app, status.clone());
                    let request = SyncRequest {
                        database_path: snapshot.database_path,
                        backup_directory: app.path().app_data_dir()?.join("rekordbox-backups"),
                        ownership: owner,
                        playlists: desired,
                    };
                    match bridge::sync(&db, request).await {
                        Ok(()) => status.sync_state = SyncState::Synced,
                        Err(error) => {
                            status.sync_state = SyncState::Error;
                            status.sync_error = Some(format!("{error:#}"));
                            retry_after = Instant::now() + Duration::from_secs(30);
                        }
                    }
                }
                // Keep pending work eligible after the debounce, even without
                // another event or a process-state transition.
                if pending && !status.running && !quiet {
                    last_read = changed_at - Duration::from_millis(1);
                }
                monitor.publish(&app, status);
                Ok::<(), anyhow::Error>(())
            }
            .await;
            if let Err(error) = result {
                retry_after = Instant::now() + Duration::from_secs(30);
                let cached = monitor
                    .snapshot
                    .lock()
                    .ok()
                    .and_then(|snapshot| snapshot.clone());
                let mut status = cached.unwrap_or_else(|| RekordboxStatus {
                    supported: true,
                    available: false,
                    running: running.unwrap_or(true),
                    database_path: None,
                    checked_at: 0,
                    error: None,
                    tracks: Vec::new(),
                    sync_state: SyncState::Error,
                    sync_error: None,
                    watching: false,
                });
                status.sync_state = SyncState::Error;
                status.sync_error = Some(format!("{error:#}"));
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
