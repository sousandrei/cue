use crate::db::entities::Song;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::Path;

pub use cue_rekordbox::{
    is_running, read_library, sync_playlists, LibrarySnapshot, LibraryTrack, Ownership, SyncRequest,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImportStatus {
    Imported,
    NotImported,
    Ambiguous,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackMatch {
    pub song_id: String,
    pub status: ImportStatus,
    pub rekordbox_id: Option<String>,
    pub bpm: Option<f64>,
    pub key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RekordboxStatus {
    pub supported: bool,
    pub available: bool,
    pub running: bool,
    pub database_path: Option<String>,
    pub checked_at: u64,
    pub error: Option<String>,
    pub tracks: Vec<TrackMatch>,
    pub sync_state: String,
    pub sync_error: Option<String>,
    pub watching: bool,
}

pub const fn supported() -> bool {
    cue_rekordbox::supported()
}

pub fn unsupported_status() -> RekordboxStatus {
    RekordboxStatus {
        supported: false,
        available: false,
        running: false,
        database_path: None,
        checked_at: 0,
        error: None,
        tracks: Vec::new(),
        sync_state: "unsupported".into(),
        sync_error: None,
        watching: false,
    }
}

pub fn playlist_memberships(
    songs: &[Song],
    matches: &[TrackMatch],
) -> BTreeMap<String, BTreeSet<String>> {
    let by_song: HashMap<&str, &TrackMatch> = matches
        .iter()
        .map(|track| (track.song_id.as_str(), track))
        .collect();
    let mut playlists = BTreeMap::<String, BTreeSet<String>>::new();
    for song in songs {
        for tag in song
            .tags
            .as_deref()
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .filter(|tag| !tag.is_empty())
        {
            let members = playlists.entry(tag.to_string()).or_default();
            if let Some(track) = by_song
                .get(song.id.as_str())
                .filter(|track| track.status == ImportStatus::Imported)
            {
                if let Some(id) = &track.rekordbox_id {
                    members.insert(id.clone());
                }
            }
        }
    }
    playlists
}

pub fn inspect(songs: &[Song], library_path: &Path) -> RekordboxStatus {
    if !supported() {
        return unsupported_status();
    }
    let checked_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    match read_library() {
        Ok(snapshot) => RekordboxStatus {
            supported: true,
            available: true,
            running: snapshot.rekordbox_running,
            tracks: match_tracks(songs, library_path, &snapshot.tracks),
            database_path: Some(snapshot.database_path),
            checked_at,
            error: None,
            sync_state: "reading".into(),
            sync_error: None,
            watching: false,
        },
        Err(error) => RekordboxStatus {
            supported: true,
            available: false,
            running: false,
            database_path: None,
            checked_at,
            error: Some(error.to_string()),
            tracks: Vec::new(),
            sync_state: "error".into(),
            sync_error: None,
            watching: false,
        },
    }
}

fn normalized_path(path: &Path) -> String {
    let resolved = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let text = resolved.to_string_lossy().replace('\\', "/");
    let text = text.strip_prefix("//?/").unwrap_or(&text);
    if cfg!(windows) || text.as_bytes().get(1) == Some(&b':') || text.starts_with("//") {
        text.to_lowercase()
    } else {
        text.to_string()
    }
}

pub fn match_tracks(
    songs: &[Song],
    library_path: &Path,
    tracks: &[LibraryTrack],
) -> Vec<TrackMatch> {
    let mut by_path: HashMap<String, Vec<&LibraryTrack>> = HashMap::new();
    for track in tracks {
        if let Some(path) = track.path.as_deref().filter(|path| !path.is_empty()) {
            by_path
                .entry(normalized_path(Path::new(path)))
                .or_default()
                .push(track);
        }
    }
    songs
        .iter()
        .map(|song| {
            let path = normalized_path(&library_path.join("Songs").join(&song.filename));
            let candidates = by_path.get(&path).map(Vec::as_slice).unwrap_or_default();
            let matched = if candidates.len() == 1 {
                Some(candidates[0])
            } else {
                None
            };
            TrackMatch {
                song_id: song.id.clone(),
                status: match candidates.len() {
                    0 => ImportStatus::NotImported,
                    1 => ImportStatus::Imported,
                    _ => ImportStatus::Ambiguous,
                },
                rekordbox_id: matched.map(|track| track.id.clone()),
                bpm: matched
                    .and_then(|track| track.bpm_hundredths)
                    .filter(|bpm| *bpm > 0)
                    .map(|bpm| bpm as f64 / 100.0),
                key: matched
                    .and_then(|track| track.key.clone())
                    .filter(|key| !key.is_empty()),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unsupported_platform_has_no_connection_or_pending_work() {
        let status = unsupported_status();
        assert!(!status.supported && !status.available && !status.running && !status.watching);
        assert!(status.tracks.is_empty() && status.database_path.is_none());
        assert_eq!(status.sync_state, "unsupported");
        assert_eq!(
            supported(),
            cfg!(any(target_os = "windows", target_os = "macos"))
        );
        #[cfg(target_os = "linux")]
        {
            assert!(!inspect(&[], Path::new("/nonexistent")).supported);
            assert!(read_library().is_err());
            assert!(is_running().is_err());
        }
    }

    fn song(filename: &str) -> Song {
        Song {
            id: "cue-id".into(),
            title: "Same title".into(),
            artist: "Same artist".into(),
            album: None,
            filename: filename.into(),
            source_url: None,
            tags: None,
        }
    }
    fn track(id: &str, path: &str) -> LibraryTrack {
        LibraryTrack {
            id: id.into(),
            path: Some(path.into()),
            bpm_hundredths: Some(12750),
            key: Some("Am".into()),
        }
    }

    #[test]
    fn matches_full_paths_and_converts_bpm() {
        let result = match_tracks(
            &[song("Track #1.mp3")],
            Path::new("C:/Music/Cue"),
            &[track("rekordbox-id", "c:\\music\\cue\\songs\\Track #1.mp3")],
        );
        assert_eq!(result[0].status, ImportStatus::Imported);
        assert_eq!(result[0].bpm, Some(127.5));
        assert_eq!(result[0].key.as_deref(), Some("Am"));
        assert_eq!(result[0].rekordbox_id.as_deref(), Some("rekordbox-id"));
    }

    #[test]
    fn same_filename_in_another_directory_does_not_match() {
        let result = match_tracks(
            &[song("track.mp3")],
            Path::new("C:/Music/Cue"),
            &[track("other", "C:/Elsewhere/track.mp3")],
        );
        assert_eq!(result[0].status, ImportStatus::NotImported);
        assert_eq!(result[0].bpm, None);
    }

    #[test]
    fn duplicate_paths_require_review() {
        let tracks = [
            track("a", "C:/Music/Cue/Songs/track.mp3"),
            track("b", "C:/Music/Cue/Songs/track.mp3"),
        ];
        let result = match_tracks(&[song("track.mp3")], Path::new("C:/Music/Cue"), &tracks);
        assert_eq!(result[0].status, ImportStatus::Ambiguous);
        assert_eq!(result[0].rekordbox_id, None);
    }

    #[test]
    fn tags_map_to_playlists_but_unimported_tracks_are_not_added() {
        let mut imported = song("imported.mp3");
        imported.id = "imported".into();
        imported.tags = Some(" house, warm-up,house, ".into());
        let mut missing = song("missing.mp3");
        missing.id = "missing".into();
        missing.tags = Some("house,new-tag".into());
        let songs = [imported, missing];
        let matches = match_tracks(
            &songs,
            Path::new("C:/Music/Cue"),
            &[track("rb-1", "C:/Music/Cue/Songs/imported.mp3")],
        );
        let playlists = playlist_memberships(&songs, &matches);
        assert_eq!(playlists["house"], BTreeSet::from(["rb-1".into()]));
        assert_eq!(playlists["warm-up"], BTreeSet::from(["rb-1".into()]));
        assert!(playlists["new-tag"].is_empty());
        assert_eq!(playlists.len(), 3);
    }
}
