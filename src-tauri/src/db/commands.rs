use tauri::{command, State};

use crate::db::entities::{Playlist, Song};
use crate::db::Database;

#[command]
pub async fn add_song(state: State<'_, Database>, song: Song) -> Result<(), String> {
    state.add_song(&song).await.map_err(|e| e.to_string())
}

#[command]
pub async fn remove_song(state: State<'_, Database>, id: String) -> Result<(), String> {
    state.remove_song(&id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn edit_song(state: State<'_, Database>, song: Song) -> Result<(), String> {
    state.edit_song(&song).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_songs(state: State<'_, Database>) -> Result<Vec<Song>, String> {
    state.get_songs().await.map_err(|e| e.to_string())
}

#[command]
pub async fn search_songs(state: State<'_, Database>, query: String) -> Result<Vec<Song>, String> {
    state.search_songs(&query).await.map_err(|e| e.to_string())
}

#[command]
pub async fn create_playlist(state: State<'_, Database>, name: String) -> Result<(), String> {
    state
        .create_playlist(&Playlist {
            id: "".to_string(),
            name,
        })
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn add_song_to_playlist(
    state: State<'_, Database>,
    song_id: String,
    playlist_id: String,
) -> Result<(), String> {
    state
        .add_song_to_playlist(&song_id, &playlist_id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn remove_song_from_playlist(
    state: State<'_, Database>,
    song_id: String,
    playlist_id: String,
) -> Result<(), String> {
    state
        .remove_song_from_playlist(&song_id, &playlist_id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_playlists(state: State<'_, Database>) -> Result<Vec<Playlist>, String> {
    state.get_playlists().await.map_err(|e| e.to_string())
}
