use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::{str::FromStr, sync::Mutex};

pub struct DbState {
    pub pool: Mutex<SqlitePool>,
}

pub async fn init_db() -> anyhow::Result<SqlitePool> {
    let opts = SqliteConnectOptions::from_str("sqlite:songs.db")?.create_if_missing(true);
    let pool = SqlitePool::connect_with(opts).await?;

    let mut conn = pool.acquire().await?;
    sqlx::migrate!("./migrations").run(&mut conn).await?;

    Ok(pool)
}

mod entities;
use anyhow::Result;
pub use entities::{Playlist, Song};

pub async fn add_song(pool: &SqlitePool, song: &Song) -> Result<()> {
    sqlx::query(include_str!("../../queries/add_song.sql"))
        .bind(&song.id)
        .bind(&song.title)
        .bind(&song.artist)
        .bind(&song.album)
        .bind(&song.file_path)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn remove_song(pool: &SqlitePool, id: &str) -> Result<()> {
    sqlx::query(include_str!("../../queries/remove_song.sql"))
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn edit_song(pool: &SqlitePool, song: &Song) -> Result<()> {
    sqlx::query(include_str!("../../queries/edit_song.sql"))
        .bind(&song.title)
        .bind(&song.artist)
        .bind(&song.album)
        .bind(&song.file_path)
        .bind(&song.id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_songs(pool: &SqlitePool) -> Result<Vec<Song>> {
    let songs = sqlx::query_as::<_, Song>(include_str!("../../queries/get_songs.sql"))
        .fetch_all(pool)
        .await?;
    Ok(songs)
}

pub async fn search_songs(pool: &SqlitePool, query: &str) -> Result<Vec<Song>> {
    let search_term = format!("%{}%", query);
    let songs = sqlx::query_as::<_, Song>(include_str!("../../queries/search_songs.sql"))
        .bind(&search_term)
        .fetch_all(pool)
        .await?;
    Ok(songs)
}

pub async fn create_playlist(pool: &SqlitePool, playlist: &Playlist) -> Result<()> {
    sqlx::query(include_str!("../../queries/create_playlist.sql"))
        .bind(&playlist.name)
        .bind(&playlist.id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn add_song_to_playlist(
    pool: &SqlitePool,
    song_id: &str,
    playlist_id: &str,
) -> Result<()> {
    sqlx::query(include_str!("../../queries/add_song_to_playlist.sql"))
        .bind(playlist_id)
        .bind(song_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn remove_song_from_playlist(
    pool: &SqlitePool,
    song_id: &str,
    playlist_id: &str,
) -> Result<()> {
    sqlx::query(include_str!("../../queries/remove_song_from_playlist.sql"))
        .bind(playlist_id)
        .bind(song_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_playlists(pool: &SqlitePool) -> Result<Vec<Playlist>> {
    let playlists = sqlx::query_as::<_, Playlist>(include_str!("../../queries/get_playlists.sql"))
        .fetch_all(pool)
        .await?;
    Ok(playlists)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_add_and_get_songs() {
        let pool = setup_test_db().await;
        let song = Song {
            id: "1".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            file_path: "/path/to/test.mp3".to_string(),
        };

        add_song(&pool, &song).await.unwrap();
        let songs = get_songs(&pool).await.unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Test Song");
    }

    #[tokio::test]
    async fn test_search_songs() {
        let pool = setup_test_db().await;
        let song1 = Song {
            id: "1".to_string(),
            title: "Apple".to_string(),
            artist: "Artist A".to_string(),
            album: None,
            file_path: "path1".to_string(),
        };
        let song2 = Song {
            id: "2".to_string(),
            title: "Banana".to_string(),
            artist: "Artist B".to_string(),
            album: None,
            file_path: "path2".to_string(),
        };

        add_song(&pool, &song1).await.unwrap();
        add_song(&pool, &song2).await.unwrap();

        let results = search_songs(&pool, "App").await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Apple");
    }
}
