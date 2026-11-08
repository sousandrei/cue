use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};

pub mod entities;

use entities::Song;

#[derive(Clone)]
pub struct Database {
    pub pool: SqlitePool,
    pub library_path: String,
}

pub type DbState = std::sync::Mutex<Option<Database>>;

/// Increases on every song write, so watchers can skip reloading unchanged songs.
static REVISION: AtomicU64 = AtomicU64::new(0);

pub fn revision() -> u64 {
    REVISION.load(Ordering::Acquire)
}

fn bump_revision() {
    REVISION.fetch_add(1, Ordering::AcqRel);
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
            .bind(&song.source_url)
            .bind(&song.tags)
            .execute(&self.pool)
            .await?;

        bump_revision();
        Ok(())
    }

    pub async fn remove_song(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/remove_song.sql"))
            .bind(id)
            .execute(&self.pool)
            .await?;

        bump_revision();
        Ok(())
    }

    pub async fn get_song_by_id(&self, id: &str) -> Result<Option<Song>, sqlx::Error> {
        let song = sqlx::query_as::<_, Song>(include_str!("../../queries/get_song_by_id.sql"))
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(song)
    }

    #[allow(dead_code)]
    pub async fn edit_song(&self, song: &Song) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/edit_song.sql"))
            .bind(&song.title)
            .bind(&song.artist)
            .bind(&song.album)
            .bind(&song.filename)
            .bind(&song.source_url)
            .bind(&song.tags)
            .bind(&song.id)
            .execute(&self.pool)
            .await?;

        bump_revision();
        Ok(())
    }

    pub async fn update_song_tags(&self, id: &str, tags: &str) -> Result<(), sqlx::Error> {
        sqlx::query(include_str!("../../queries/update_song_tags.sql"))
            .bind(tags)
            .bind(id)
            .execute(&self.pool)
            .await?;

        bump_revision();
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn shared_sqlite_build_keeps_cue_database_unencrypted() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("songs.db");
        let url = format!("sqlite:{}", path.to_string_lossy().replace('\\', "/"));
        let pool = init_db(&url).await.unwrap();
        sqlx::query("INSERT INTO songs (id, title, artist, filename) VALUES ('compatibility', 'Track', 'Artist', 'track.mp3')")
            .execute(&pool).await.unwrap();
        pool.close().await;
        // A workspace build can unify rbox's SQLCipher features with SQLx's.
        // Cue's own files must remain ordinary, unencrypted SQLite databases.
        assert_eq!(&std::fs::read(&path).unwrap()[..16], b"SQLite format 3\0");
        let reopened = SqlitePool::connect(&url).await.unwrap();
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM songs WHERE id = 'compatibility'")
                .fetch_one(&reopened)
                .await
                .unwrap();
        assert_eq!(count, 1);
        reopened.close().await;
    }

    async fn setup_test_db(suffix: &str) -> Database {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        let mut temp_dir = std::env::temp_dir();
        temp_dir.push(format!("cue_test_{}_{}", std::process::id(), suffix));
        std::fs::create_dir_all(&temp_dir).unwrap();
        Database {
            pool,
            library_path: temp_dir.to_string_lossy().to_string(),
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
            source_url: Some("https://example.com".to_string()),
            tags: None,
        };

        db.add_song(&song).await.unwrap();
        let songs = db.get_songs().await.unwrap();
        assert_eq!(songs.len(), 1);
        assert_eq!(songs[0].title, "Test Song");
        assert_eq!(songs[0].source_url, Some("https://example.com".to_string()));
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
            source_url: None,
            tags: None,
        };
        let song2 = Song {
            id: "2".to_string(),
            title: "Banana".to_string(),
            artist: "Artist B".to_string(),
            album: None,
            filename: "path2".to_string(),
            source_url: None,
            tags: None,
        };

        db.add_song(&song1).await.unwrap();
        db.add_song(&song2).await.unwrap();

        let results = db.search_songs("App").await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Apple");
    }

    #[tokio::test]
    async fn tags_are_saved_without_rekordbox() {
        let db = setup_test_db("tags").await;
        let song = Song {
            id: "tagged".into(),
            title: "Example".into(),
            artist: "Fixture".into(),
            album: None,
            filename: "track.mp3".into(),
            source_url: None,
            tags: None,
        };
        db.add_song(&song).await.unwrap();
        db.update_song_tags(&song.id, "house,warm-up")
            .await
            .unwrap();
        let saved = db.get_song_by_id(&song.id).await.unwrap().unwrap();
        assert_eq!(saved.tags.as_deref(), Some("house,warm-up"));
    }
}
