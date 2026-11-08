use crate::{
    LibrarySnapshot, LibraryTrack as Track, Membership, Playlist, SyncRequest, SyncResult,
};
use anyhow::Result;
use diesel::prelude::*;
use rbox_core::locate_library;
use rbox_db::{ConnectionOptions, OpenMode};
use std::path::Path;
#[path = "sync.rs"]
mod sync;

pub fn is_running() -> Result<bool> {
    let mut system = sysinfo::System::new();
    system.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::nothing().without_tasks(),
    );
    Ok(system.processes().values().any(|process| {
        process.name().to_str().is_some_and(|name| {
            name.eq_ignore_ascii_case("rekordbox") || name.eq_ignore_ascii_case("rekordbox.exe")
        })
    }))
}
pub fn read_library() -> Result<LibrarySnapshot> {
    read_library_at(&locate_library()?.db_path)
}
/// Read a selected library without changing its database or playlist index.
pub fn read_library_at(path: &Path) -> Result<LibrarySnapshot> {
    let tracks = read_tracks(path)?;
    let mut connection = read_connection(path)?;
    let playlists = diesel::sql_query("SELECT ID AS id, Name AS name, ParentID AS parent_id FROM djmdPlaylist WHERE rb_local_deleted = 0 ORDER BY ID").load::<Playlist>(&mut connection)?;
    let memberships = diesel::sql_query("SELECT ID AS id, PlaylistID AS playlist_id, ContentID AS content_id FROM djmdSongPlaylist WHERE rb_local_deleted = 0 ORDER BY ID").load::<Membership>(&mut connection)?;
    Ok(LibrarySnapshot {
        database_path: path.to_string_lossy().into_owned(),
        rekordbox_running: is_running()?,
        tracks,
        playlists,
        memberships,
    })
}
/// Reconcile playlists only while Rekordbox is closed, using verified copies and backups.
pub fn sync_playlists(request: &SyncRequest) -> Result<SyncResult> {
    sync::sync(Path::new(&request.database_path), request.clone())
}

fn read_connection(path: &Path) -> Result<diesel::SqliteConnection> {
    let options = ConnectionOptions {
        open_mode: OpenMode::ReadOnly,
        busy_timeout: std::time::Duration::from_millis(250),
        ..ConnectionOptions::default()
    };
    Ok(rbox_masterdb::establish_connection(path, &options)?)
}

fn read_tracks(path: &Path) -> Result<Vec<Track>> {
    let mut connection = read_connection(path)?;
    let tracks: Vec<Track> = diesel::sql_query(
        "SELECT c.ID AS id, c.FolderPath AS path, c.BPM AS bpm_hundredths, k.ScaleName AS key \
         FROM djmdContent c LEFT JOIN djmdKey k ON c.KeyID = k.ID \
         WHERE c.rb_local_deleted = 0",
    )
    .load(&mut connection)?;
    Ok(tracks)
}

#[derive(QueryableByName)]
struct Integrity {
    #[diesel(sql_type = diesel::sql_types::Text)]
    integrity_check: String,
}

fn validate_database(path: &Path) -> Result<()> {
    let mut connection = read_connection(path)?;
    let result: Vec<Integrity> =
        diesel::sql_query("PRAGMA integrity_check").load(&mut connection)?;
    anyhow::ensure!(
        result.len() == 1 && result[0].integrity_check == "ok",
        "Staged Rekordbox database did not pass integrity validation"
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use diesel::connection::SimpleConnection;

    #[test]
    fn read_only_connection_rejects_writes() {
        let folder = tempfile::tempdir().unwrap();
        let path = folder.path().join("master.db");
        let options = ConnectionOptions {
            open_mode: OpenMode::ReadWriteCreate,
            ..ConnectionOptions::default()
        };
        let mut connection = rbox_masterdb::establish_connection(&path, &options).unwrap();
        connection
            .batch_execute("CREATE TABLE example (value TEXT)")
            .unwrap();
        drop(connection);
        let before = std::fs::read(&path).unwrap();
        let mut connection = read_connection(&path).unwrap();
        assert!(connection
            .batch_execute("INSERT INTO example VALUES ('unexpected write')")
            .is_err());
        drop(connection);
        assert_eq!(before, std::fs::read(path).unwrap());
    }
}
