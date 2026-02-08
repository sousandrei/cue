mod config;
mod db;
mod download;

use db::DbState;
use std::sync::Mutex;
use tauri::{Manager, State};

#[tauri::command]
async fn add_song(state: State<'_, DbState>, song: db::Song) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::add_song(&pool, &song).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_song(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::remove_song(&pool, &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn edit_song(state: State<'_, DbState>, song: db::Song) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::edit_song(&pool, &song).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_songs(state: State<'_, DbState>) -> Result<Vec<db::Song>, String> {
    let pool = state.pool.lock().unwrap().clone();
    db::get_songs(&pool).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn search_songs(state: State<'_, DbState>, query: String) -> Result<Vec<db::Song>, String> {
    let pool = state.pool.lock().unwrap().clone();
    db::search_songs(&pool, &query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_playlist(state: State<'_, DbState>, name: String) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::create_playlist(
        &pool,
        &db::Playlist {
            id: "".to_string(),
            name,
        },
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_song_to_playlist(
    state: State<'_, DbState>,
    song_id: String,
    playlist_id: String,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::add_song_to_playlist(&pool, &song_id, &playlist_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_song_from_playlist(
    state: State<'_, DbState>,
    song_id: String,
    playlist_id: String,
) -> Result<(), String> {
    let pool = state.pool.lock().unwrap().clone();
    db::remove_song_from_playlist(&pool, &song_id, &playlist_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_playlists(state: State<'_, DbState>) -> Result<Vec<db::Playlist>, String> {
    let pool = state.pool.lock().unwrap().clone();
    db::get_playlists(&pool).await.map_err(|e| e.to_string())
}

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

                app.manage(DbState {
                    pool: Mutex::new(pool),
                });

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
            add_song,
            remove_song,
            edit_song,
            get_songs,
            search_songs,
            create_playlist,
            add_song_to_playlist,
            remove_song_from_playlist,
            get_playlists,
            update_config,
            download::download_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
