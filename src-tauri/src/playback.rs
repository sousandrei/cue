use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

use crate::db::DbState;

// Resolve database filenames inside the configured library, including symlinks.
fn resolve_audio_path(library: &Path, filename: &str) -> Result<PathBuf, String> {
    let root = library
        .join("Songs")
        .canonicalize()
        .map_err(|_| "The songs folder is unavailable")?;
    let path = root
        .join(filename)
        .canonicalize()
        .map_err(|_| "This track is missing locally. Use Sync to download it again.")?;
    if !path.starts_with(&root) || !path.is_file() {
        return Err("The track must be a file inside the songs folder".into());
    }
    Ok(path)
}

#[tauri::command]
pub async fn get_song_audio_path(
    id: String,
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let db = state
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Database not initialized")?;
    let song = db
        .get_song_by_id(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Song not found")?;
    let path = resolve_audio_path(Path::new(&db.library_path), &song.filename)?;
    // Only grant access to the resolved song, never the entire filesystem.
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_tracks_and_rejects_missing_files_and_path_escapes() {
        let library = tempfile::tempdir().unwrap();
        let songs = library.path().join("Songs");
        std::fs::create_dir(&songs).unwrap();
        std::fs::write(songs.join("a track #1.mp3"), b"audio").unwrap();
        std::fs::write(library.path().join("outside.mp3"), b"audio").unwrap();
        assert_eq!(
            resolve_audio_path(library.path(), "a track #1.mp3").unwrap(),
            songs.join("a track #1.mp3").canonicalize().unwrap()
        );
        assert!(resolve_audio_path(library.path(), "missing.mp3").is_err());
        assert!(resolve_audio_path(library.path(), "../outside.mp3").is_err());
        assert!(resolve_audio_path(library.path(), "").is_err());
        assert!(resolve_audio_path(
            library.path(),
            library.path().join("outside.mp3").to_str().unwrap()
        )
        .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_outside_the_songs_folder() {
        let library = tempfile::tempdir().unwrap();
        std::fs::create_dir(library.path().join("Songs")).unwrap();
        let outside = library.path().join("outside.mp3");
        std::fs::write(&outside, b"audio").unwrap();
        std::os::unix::fs::symlink(outside, library.path().join("Songs/link.mp3")).unwrap();
        assert!(resolve_audio_path(library.path(), "link.mp3").is_err());
    }
}
