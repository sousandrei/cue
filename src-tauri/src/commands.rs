use tauri::{command, AppHandle, Emitter, Manager, Runtime, State};

use crate::bundler;
use crate::config::{self, Config, ConfigState};
use crate::db::entities::Song;
use crate::db::Database;
use crate::db::DbState;
use crate::download::{self, DownloadJob, MetadataPayload};

// --- Config Commands ---

#[command]
pub async fn get_config(state: State<'_, ConfigState>) -> Result<Option<Config>, String> {
    let config = state.lock().unwrap();
    Ok(config.clone())
}

#[command]
pub async fn update_config(
    state: State<'_, ConfigState>,
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

    // Ensure dependencies
    bundler::ensure_ytdlp(&app, &new_config.yt_dlp_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_ffmpeg(&app, &new_config.ffmpeg_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_bun(&app, &new_config.bun_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_ejs(&app, &new_config.ejs_version)
        .await
        .map_err(|e| e.to_string())?;

    app.emit("config://update", new_config.clone())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn initialize_setup(
    cfg_state: State<'_, ConfigState>,
    db_state: State<'_, DbState>,
    app: AppHandle,
    library_path: String,
) -> Result<(), String> {
    let config = Config {
        library_path: library_path.clone(),
        yt_dlp_version: "2026.02.04".to_string(),
        ffmpeg_version: "7.1".to_string(),
        bun_version: "1.3.9".to_string(),
        ejs_version: "0.4.0".to_string(),
        auto_update: true,
    };

    // Save config
    config::save_config(&config)?;

    // Initialize DB
    let db_path = format!("sqlite:{}/songs.db", library_path);
    let pool = crate::db::init_db(&db_path)
        .await
        .map_err(|e| format!("Failed to initialize database: {}", e))?;

    let db_instance = Database {
        pool,
        library_path: library_path.clone(),
    };

    // Update states
    {
        let mut cfg = cfg_state.lock().unwrap();
        *cfg = Some(config.clone());
    }
    {
        let mut db_entry = db_state.lock().unwrap();
        *db_entry = Some(db_instance);
    }

    // Ensure dependencies
    bundler::ensure_ytdlp(&app, &config.yt_dlp_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_ffmpeg(&app, &config.ffmpeg_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_bun(&app, &config.bun_version)
        .await
        .map_err(|e| e.to_string())?;

    bundler::ensure_ejs(&app, &config.ejs_version)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

// --- DB Commands ---

#[command]
pub async fn remove_song(
    db_state: State<'_, DbState>,
    cfg_state: State<'_, ConfigState>,
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
pub async fn get_songs(state: State<'_, DbState>) -> Result<Vec<Song>, String> {
    let db = {
        let db_guard = state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };
    db.get_songs().await.map_err(|e| e.to_string())
}

#[command]
pub async fn search_songs(state: State<'_, DbState>, query: String) -> Result<Vec<Song>, String> {
    let db = {
        let db_guard = state.lock().unwrap();
        db_guard.clone().ok_or("Database not initialized")?
    };
    db.search_songs(&query).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_song_by_id(state: State<'_, DbState>, id: String) -> Result<Option<Song>, String> {
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
    cfg_state: State<'_, ConfigState>,
    url: String,
) -> Result<Vec<MetadataPayload>, String> {
    {
        let config_guard = cfg_state.lock().unwrap();
        let _config = config_guard.as_ref().ok_or("Config not initialized")?;
    }
    // We pass the State to download::get_metadata which might need adjustment if it expects non-option
    // Let's check download.rs
    download::get_metadata(app, cfg_state, url).await
}

#[command]
pub async fn add_to_queue(
    manager: State<'_, download::DownloadManager>,
    url: String,
    id: String,
    metadata: MetadataPayload,
) -> Result<(), String> {
    let job = DownloadJob {
        id,
        title: format!("{} - {}", metadata.artist, metadata.title),
        progress: 0.0,
        status: "queued".into(),
        url,
        metadata,
        logs: Vec::new(),
    };
    manager.add_job(job);
    Ok(())
}

#[command]
pub async fn get_downloads(
    manager: State<'_, download::DownloadManager>,
) -> Result<Vec<DownloadJob>, String> {
    Ok(manager.get_jobs())
}

#[command]
pub async fn remove_download(
    manager: State<'_, download::DownloadManager>,
    id: String,
) -> Result<(), String> {
    manager.remove_job(&id);
    Ok(())
}

#[command]
pub async fn clear_history(manager: State<'_, download::DownloadManager>) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}

#[command]
pub async fn clear_queue(manager: State<'_, download::DownloadManager>) -> Result<(), String> {
    manager.clear_queue();
    Ok(())
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

#[command]
pub async fn factory_reset(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?
        .join("cue");

    if app_data_dir.exists() {
        std::fs::remove_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to delete app data: {}", e))?;
    }

    if config_dir.exists() {
        std::fs::remove_dir_all(&config_dir)
            .map_err(|e| format!("Failed to delete config: {}", e))?;
    }

    app.restart();
}

#[command]
pub async fn check_health(app: AppHandle, state: State<'_, ConfigState>) -> Result<bool, String> {
    let config_guard = state.lock().unwrap();
    if let Some(cfg) = config_guard.as_ref() {
        Ok(bundler::check_bundler_health(&app, cfg))
    } else {
        Ok(false)
    }
}
