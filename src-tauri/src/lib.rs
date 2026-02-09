mod commands;
mod config;
mod db;
mod download;
mod rekordbox;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                if let Err(e) = init_app(app).await {
                    eprintln!("Failed to initialize application: {}", e);
                }
            });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::update_config,
            commands::get_songs,
            commands::search_songs,
            commands::get_metadata,
            commands::remove_song,
            commands::remove_download,
            commands::add_to_queue,
            commands::get_downloads,
            commands::clear_history,
            commands::clear_queue,
            commands::read_file_content,
            commands::initialize_setup,
            commands::get_song_by_id,
            commands::cancel_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn init_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let config = config::load_config().map_err(|e| e.to_string())?;

    if let Some(cfg) = config {
        let db_path = format!("sqlite:{}/songs.db", cfg.library_path);
        let pool = db::init_db(&db_path).await?;

        app.manage(Mutex::new(Some(Database {
            pool,
            library_path: cfg.library_path.clone(),
        })));
        app.manage(download::ActiveProcesses(Mutex::new(
            std::collections::HashMap::new(),
        )));
        app.manage(download::DownloadManager::new(app.handle().clone()));

        // Initialize yt-dlp
        if let Err(e) = download::ensure_ytdlp(app.handle(), &cfg.yt_dlp_version).await {
            eprintln!("Failed to ensure yt-dlp: {}", e);
        }

        app.manage(Mutex::new(Some(cfg)));
    } else {
        app.manage(Mutex::new(None::<Database>));
        app.manage(Mutex::new(None::<config::Config>));
        // Also manage active processes and download manager even if no config yet
        app.manage(download::ActiveProcesses(Mutex::new(
            std::collections::HashMap::new(),
        )));
        app.manage(download::DownloadManager::new(app.handle().clone()));
    }

    Ok(())
}
