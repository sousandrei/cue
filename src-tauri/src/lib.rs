mod commands;
mod config;
mod db;
mod download;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                let config = config::load_config().expect("failed to load config");

                if let Some(cfg) = config {
                    let db_path = format!("sqlite:{}/songs.db", cfg.library_path);
                    let pool = db::init_db(&db_path)
                        .await
                        .expect("failed to initialize database");

                    app.manage(Mutex::new(Some(Database { pool })));

                    // Initialize yt-dlp
                    if let Err(e) = download::ensure_ytdlp(app.handle(), &cfg.yt_dlp_version).await
                    {
                        eprintln!("Failed to ensure yt-dlp: {}", e);
                    }

                    app.manage(Mutex::new(Some(cfg)));
                } else {
                    app.manage(Mutex::new(None::<Database>));
                    app.manage(Mutex::new(None::<config::Config>));
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
            commands::download_audio,
            commands::get_metadata,
            commands::remove_song,
            commands::read_file_content,
            commands::initialize_setup,
            commands::get_song_by_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
