use std::sync::Mutex;
use tauri::{command, AppHandle, Runtime, State};

use crate::config::{self, Config};
use crate::db::entities::Song;
use crate::db::Database;
use crate::download::{self, MetadataPayload};

// --- Config Commands ---

#[command]
pub async fn get_config(state: State<'_, Mutex<Config>>) -> Result<Config, String> {
    let config = state.lock().unwrap();
    Ok(config.clone())
}

#[command]
pub async fn update_config(
    state: State<'_, Mutex<Config>>,
    app: AppHandle,
    new_config: Config,
) -> Result<(), String> {
    config::update_config(state, app, new_config).await
}

// --- DB Commands ---

#[command]
pub async fn remove_song(
    state: State<'_, Database>,
    cfg: State<'_, Mutex<Config>>,
    id: String,
) -> Result<(), String> {
    let song = state
        .get_song_by_id(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Song not found".to_string())?;

    let library_path = {
        let config = cfg.lock().unwrap();
        config.library_path.clone()
    };

    let file_path = std::path::Path::new(&library_path).join("Songs").join(&song.filename);

    // Delete the file from the filesystem
    if let Err(e) = std::fs::remove_file(&file_path) {
        eprintln!("Failed to delete file {}: {}", file_path.display(), e);
    }

    state.remove_song(&id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_songs(state: State<'_, Database>) -> Result<Vec<Song>, String> {
    state.get_songs().await.map_err(|e| e.to_string())
}

#[command]
pub async fn search_songs(state: State<'_, Database>, query: String) -> Result<Vec<Song>, String> {
    state.search_songs(&query).await.map_err(|e| e.to_string())
}

// --- Download Commands ---

#[command]
pub async fn get_metadata<R: Runtime>(
    app: AppHandle<R>,
    cfg: State<'_, Mutex<Config>>,
    url: String,
) -> Result<MetadataPayload, String> {
    download::get_metadata(app, cfg, url).await
}

#[command]
pub async fn download_audio<R: Runtime>(
    app: AppHandle<R>,
    cfg: State<'_, Mutex<Config>>,
    url: String,
    id: String,
    metadata: MetadataPayload,
) -> Result<(), String> {
    download::download_audio(app, cfg, url, id, metadata).await
}

#[command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
