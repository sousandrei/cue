use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::str::FromStr;

pub mod commands;
pub mod entities;

use entities::{Playlist, Song};

pub struct Database {
    pub pool: SqlitePool,
}

pub async fn init_db(db_path: &str) -> anyhow::Result<SqlitePool> {
    let opts = SqliteConnectOptions::from_str(db_path)?.create_if_missing(true);
    let pool = SqlitePool::connect_with(opts).await?;

    let mut conn = pool.acquire().await?;
    sqlx::migrate!("./migrations").run(&mut conn).await?;

    Ok(pool)
}

impl Database {
    pub async fn add_song(&self, song: &Song) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/add_song.sql"))
            .bind(&song.id)
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(&song.file_path)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_song(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/remove_song.sql"))
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn edit_song(&self, song: &Song) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/edit_song.sql"))
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(&song.file_path)
            .bind(&song.id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_songs(&self) -> Result<Vec<Song>, sqlx::Error> {
        let songs = sqlx::query_as::<_, Song>(include_str!("../../queries/get_songs.sql"))
            .fetch_all(&self.pool)
            .await?;
        Ok(songs)
    }

    pub async fn search_songs(&self, query: &str) -> Result<Vec<Song>, sqlx::Error> {
        let search_term = format!("%{}%", query);
        let songs = sqlx::query_as::<_, Song>(include_str!("../../queries/search_songs.sql"))
            .bind(&search_term)
            .fetch_all(&self.pool)
            .await?;
        Ok(songs)
    }

    pub async fn create_playlist(&self, playlist: &Playlist) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/create_playlist.sql"))
            .bind(&playlist.name)
            .bind(&playlist.id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn add_song_to_playlist(
        &self,
        song_id: &str,
        playlist_id: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/add_song_to_playlist.sql"))
            .bind(playlist_id)
            .bind(song_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn remove_song_from_playlist(
        &self,
        song_id: &str,
        playlist_id: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/remove_song_from_playlist.sql"))
            .bind(playlist_id)
            .bind(song_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn get_playlists(&self) -> Result<Vec<Playlist>, sqlx::Error> {
        let playlists =
            sqlx::query_as::<_, Playlist>(include_str!("../../queries/get_playlists.sql"))
                .fetch_all(&self.pool)
                .await?;
        Ok(playlists)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> Database {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        Database { pool }
    }

    #[tokio::test]
    async fn test_add_and_get_songs() {
        let db = setup_test_db().await;
        let song = Song {
            id: "1".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            file_path: "/path/to/test.mp3".to_string(),
        };

        db.add_song(&song).await.unwrap();
        let songs = db.get_songs().await.unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Test Song");
    }

    #[tokio::test]
    async fn test_search_songs() {
        let db = setup_test_db().await;
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

        db.add_song(&song1).await.unwrap();
        db.add_song(&song2).await.unwrap();

        let results = db.search_songs("App").await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Apple");
    }
}
