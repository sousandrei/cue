mod bundler;
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
            commands::factory_reset,
            commands::check_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn init_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Initializing state as empty
    let cfg_state: config::ConfigState = Mutex::new(None);
    let db_state: db::DbState = Mutex::new(None);
    let download_manager = download::DownloadManager::new();

    // Manage states immediately so commands can access them even if loading fails
    app.manage(cfg_state);
    app.manage(db_state);
    app.manage(download_manager);

    // Now try to load config and initialize DB
    let config = match config::load_config() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Warning: Failed to load config: {}", e);
            None
        }
    };

    if let Some(cfg) = config {
        let is_healthy = bundler::check_bundler_health(app.handle(), &cfg);

        if is_healthy {
            let db_path = format!("sqlite:{}/songs.db", cfg.library_path);
            match db::init_db(&db_path).await {
                Ok(pool) => {
                    let state = app.state::<db::DbState>();
                    let mut db_guard = state.lock().unwrap();
                    *db_guard = Some(Database {
                        pool,
                        library_path: cfg.library_path.clone(),
                    });
                }
                Err(e) => eprintln!("Warning: Failed to initialize DB: {}", e),
            }

            {
                let state = app.state::<config::ConfigState>();
                let mut cfg_guard = state.lock().unwrap();
                *cfg_guard = Some(cfg.clone());
            }
        } else {
            // If NOT healthy, we still manage the config but maybe we shouldn't?
            // The user said: "go back to the setup screen with the values of the config file"
            // So we MUST manage it so get_config returns it.
            {
                let state = app.state::<config::ConfigState>();
                let mut cfg_guard = state.lock().unwrap();
                *cfg_guard = Some(cfg.clone());
            }
        }
    } else {
        // If config doesn't exist, we don't restart (infinite loop!)
        // The frontend will handle redirecting to /setup
        eprintln!("No config found, waiting for setup.");
    }

    Ok(())
}
