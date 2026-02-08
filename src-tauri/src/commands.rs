use std::sync::Mutex;
use tauri::{command, AppHandle, Runtime, State};

use crate::config::{self, Config};
use crate::db::entities::Song;
use crate::db::Database;
use crate::download::{self, MetadataPayload};

// --- Config Commands ---

#[command]
pub async fn get_config(state: State<'_, Mutex<Option<Config>>>) -> Result<Option<Config>, String> {
    let config = state.lock().unwrap();
    Ok(config.clone())
}

#[command]
pub async fn update_config(
    state: State<'_, Mutex<Option<Config>>>,
    app: AppHandle,
    new_config: Config,
) -> Result<(), String> {
    // Save to file
    config::save_config(&new_config)?;

    // Update state
    {
        let mut config = state.lock().unwrap();
        *config = Some(new_config.clone());
    }

    // Ensure yt-dlp version
    download::ensure_ytdlp(&app, &new_config.yt_dlp_version)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn initialize_setup(
    cfg_state: State<'_, Mutex<Option<Config>>>,
    db_state: State<'_, Mutex<Option<Database>>>,
    app: AppHandle,
    library_path: String,
) -> Result<(), String> {
    let config = Config {
        library_path: library_path.clone(),
        yt_dlp_version: "2026.02.04".to_string(),
    };

    // Save config
    config::save_config(&config)?;

    // Initialize DB
    let db_path = format!("sqlite:{}/songs.db", library_path);
    let pool = crate::db::init_db(&db_path)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    let db_instance = Database { pool };

    // Update states
    {
        let mut cfg = cfg_state.lock().unwrap();
        *cfg = Some(config.clone());
    }
    {
        let mut db_entry = db_state.lock().unwrap();
        *db_entry = Some(db_instance);
    }

    // Ensure yt-dlp
    download::ensure_ytdlp(&app, &config.yt_dlp_version)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// --- DB Commands ---

#[command]
pub async fn remove_song(
    db_state: State<'_, Mutex<Option<Database>>>,
    cfg_state: State<'_, Mutex<Option<Config>>>,
    id: String,
) -> Result<(), String> {
    let db = {
        let db_guard = db_state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };

    let song = db
        .get_song_by_id(&id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Song not found".to_string())?;

    let library_path = {
        let config_guard = cfg_state.lock().unwrap();
        let config = config_guard.as_ref().ok_or("Config not initialized")?;
        config.library_path.clone()
    };

    let file_path = std::path::Path::new(&library_path)
        .join("Songs")
        .join(&song.filename);

    // Delete the file from the filesystem
    if let Err(e) = std::fs::remove_file(&file_path) {
        eprintln!("Failed to delete file {}: {}", file_path.display(), e);
    }

    db.remove_song(&id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_songs(state: State<'_, Mutex<Option<Database>>>) -> Result<Vec<Song>, String> {
    let db = {
        let db_guard = state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };
    db.get_songs().await.map_err(|e| e.to_string())
}

#[command]
pub async fn search_songs(
    state: State<'_, Mutex<Option<Database>>>,
    query: String,
) -> Result<Vec<Song>, String> {
    let db = {
        let db_guard = state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };
    db.search_songs(&query).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_song_by_id(
    state: State<'_, Mutex<Option<Database>>>,
    id: String,
) -> Result<Option<Song>, String> {
    let db = {
        let db_guard = state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };
    db.get_song_by_id(&id).await.map_err(|e| e.to_string())
}

// --- Download Commands ---

#[command]
pub async fn get_metadata<R: Runtime>(
    app: AppHandle<R>,
    cfg: State<'_, Mutex<Option<Config>>>,
    url: String,
) -> Result<Vec<MetadataPayload>, String> {
    {
        let config_guard = cfg.lock().unwrap();
        let _config = config_guard.as_ref().ok_or("Config not initialized")?;
    }
    // We pass the State to download::get_metadata which might need adjustment if it expects non-option
    // Let's check download.rs
    download::get_metadata(app, cfg, url).await
}

#[command]
pub async fn download_audio<R: Runtime>(
    app: AppHandle<R>,
    cfg: State<'_, Mutex<Option<Config>>>,
    url: String,
    id: String,
    metadata: MetadataPayload,
) -> Result<(), String> {
    {
        let config_guard = cfg.lock().unwrap();
        let _config = config_guard.as_ref().ok_or("Config not initialized")?;
    }
    download::download_audio(app, cfg, url, id, metadata).await
}

#[command]
pub async fn cancel_download(
    state: State<'_, download::ActiveProcesses>,
    id: String,
) -> Result<(), String> {
    let mut processes = state.0.lock().unwrap();
    if let Some(cancel_tx) = processes.remove(&id) {
        let _ = cancel_tx.send(());
    }
    Ok(())
}

#[command]
pub async fn read_file_content(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
