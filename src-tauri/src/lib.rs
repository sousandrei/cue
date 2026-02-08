mod config;
mod db;
mod download;

use db::Database;
use std::sync::Mutex;
use tauri::{Manager, State};

#[tauri::command]
async fn update_config(
    state: State<'_, Mutex<config::Config>>,
    app: tauri::AppHandle,
    new_config: config::Config,
) -> Result<(), String> {
    // Save to file
    config::save_config(&new_config).map_err(|e| e.to_string())?;

    // Update state
    {
        let mut config = state.lock().unwrap();
        *config = new_config.clone();
    }

    // Ensure yt-dlp version
    download::ensure_ytdlp(&app, &new_config.yt_dlp_version)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let config = config::load_config().expect("failed to load config");
                let db_path = format!("sqlite:{}/songs.db", config.library_path);
                let pool = db::init_db(&db_path)
                    .await
                    .expect("failed to initialize database");

                app.manage(Database { pool });

                // Initialize yt-dlp
                if let Err(e) = download::ensure_ytdlp(app.handle(), &config.yt_dlp_version).await {
                    eprintln!("Failed to ensure yt-dlp: {}", e);
                }

                // Manage config state
                app.manage(Mutex::new(config));
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            update_config,
            db::commands::add_song,
            db::commands::remove_song,
            db::commands::edit_song,
            db::commands::get_songs,
            db::commands::search_songs,
            db::commands::create_playlist,
            db::commands::add_song_to_playlist,
            db::commands::remove_song_from_playlist,
            db::commands::get_playlists,
            download::download_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
