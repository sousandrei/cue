use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::str::FromStr;

pub mod entities;

use entities::{Playlist, Song};

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
    pub library_path: String,
}

pub async fn init_db(db_path: &str) -> anyhow::Result<SqlitePool> {
    let opts = SqliteConnectOptions::from_str(db_path)?.create_if_missing(true);
    let pool = SqlitePool::connect_with(opts).await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

impl Database {
    pub async fn add_song(&self, song: &Song) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/add_song.sql"))
            .bind(&song.id)
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(&song.filename)
            .execute(&self.pool)
            .await?;
        
        self.trigger_rekordbox_export().await;
        Ok(())
    }

    pub async fn remove_song(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/remove_song.sql"))
            .bind(id)
            .execute(&self.pool)
            .await?;

        self.trigger_rekordbox_export().await;
        Ok(())
    }

    pub async fn get_song_by_id(&self, id: &str) -> Result<Option<Song>, sqlx::Error> {
        let song = sqlx::query_as::<_, Song>(include_str!("../../queries/get_song_by_id.sql"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(song)
    }

    pub async fn edit_song(&self, song: &Song) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/edit_song.sql"))
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(&song.filename)
            .bind(&song.id)
            .execute(&self.pool)
            .await?;

        self.trigger_rekordbox_export().await;
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

    async fn trigger_rekordbox_export(&self) {
        let songs = match self.get_songs().await {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Failed to get songs for Rekordbox export: {}", e);
                return;
            }
        };

        if let Err(e) = crate::rekordbox::export_xml(songs, &self.library_path).await {
            eprintln!("Failed to export Rekordbox XML: {}", e);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db(suffix: &str) -> Database {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let mut temp_dir = std::env::temp_dir();
        temp_dir.push(format!("cue_test_{}_{}", std::process::id(), suffix));
        std::fs::create_dir_all(&temp_dir).unwrap();
        Database { 
            pool, 
            library_path: temp_dir.to_string_lossy().to_string() 
        }
    }

    #[tokio::test]
    async fn test_add_and_get_songs() {
        let db = setup_test_db("add_get").await;
        let song = Song {
            id: "1".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            filename: "test.mp3".to_string(),
        };

        db.add_song(&song).await.unwrap();
        let songs = db.get_songs().await.unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Test Song");
    }

    #[tokio::test]
    async fn test_search_songs() {
        let db = setup_test_db("search").await;
        let song1 = Song {
            id: "1".to_string(),
            title: "Apple".to_string(),
            artist: "Artist A".to_string(),
            album: None,
            filename: "path1".to_string(),
        };
        let song2 = Song {
            id: "2".to_string(),
            title: "Banana".to_string(),
            artist: "Artist B".to_string(),
            album: None,
            filename: "path2".to_string(),
        };

        db.add_song(&song1).await.unwrap();
        db.add_song(&song2).await.unwrap();

        let results = db.search_songs("App").await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Apple");
    }

    #[tokio::test]
    async fn test_export_rekordbox_xml() {
        let db = setup_test_db("export").await;
        let song = Song {
            id: "1".to_string(),
            title: "Test Song".to_string(),
            artist: "Test Artist".to_string(),
            album: Some("Test Album".to_string()),
            filename: "test.mp3".to_string(),
        };

        // Ensure Songs directory exists
        let library_path = std::path::Path::new(&db.library_path);
        std::fs::create_dir_all(library_path.join("Songs")).unwrap();

        // Adding a song should trigger export
        db.add_song(&song).await.unwrap();

        let xml_path = library_path.join("rekordbox.xml");
        assert!(xml_path.exists());

        let xml_content = std::fs::read_to_string(xml_path).unwrap();
        assert!(xml_content.contains("DJ_PLAYLISTS"));
        assert!(xml_content.contains("COLLECTION"));
        assert!(xml_content.contains("TRACK"));
        assert!(xml_content.contains("TrackID=\"1\""));
        assert!(xml_content.contains("Name=\"Test Song\""));
        assert!(xml_content.contains("Artist=\"Test Artist\""));
        assert!(xml_content.contains("Location=\"file://localhost"));
        assert!(xml_content.contains("test.mp3\""));
    }
}
