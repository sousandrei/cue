use crate::sync::{self, Entry, Library, PlaylistInfo, PlaylistKind};
use crate::{
    LibrarySnapshot, LibraryTrack as Track, Membership, Playlist, SyncRequest, SyncResult,
};
use anyhow::Result;
use diesel::prelude::*;
use rbox_core::locate_library;
use rbox_db::{ConnectionOptions, OpenMode};
use rbox_masterdb::{MasterDb, PlaylistType};
use std::path::Path;

pub fn is_running() -> Result<bool> {
    Ok(rbox_core::is_rekordbox_running())
}

pub fn read_library() -> Result<LibrarySnapshot> {
    read_library_at(&locate_library()?.db_path)
}
/// Read a selected library without changing its database or playlist index.
pub fn read_library_at(path: &Path) -> Result<LibrarySnapshot> {
    let mut connection = read_connection(path)?;
    let tracks = read_tracks(&mut connection)?;
    let playlists = diesel::sql_query(format!("SELECT ID AS id, Name AS name, ParentID AS parent_id, Attribute = {} AS is_folder, Attribute = {} AS is_regular FROM djmdPlaylist WHERE rb_local_deleted = 0 ORDER BY ID", PlaylistType::Folder as i32, PlaylistType::List as i32)).load::<Playlist>(&mut connection)?;
    let memberships = diesel::sql_query("SELECT ID AS id, PlaylistID AS playlist_id, ContentID AS content_id FROM djmdSongPlaylist WHERE rb_local_deleted = 0 ORDER BY ID").load::<Membership>(&mut connection)?;
    Ok(LibrarySnapshot {
        database_path: path.to_string_lossy().into_owned(),
        rekordbox_running: is_running()?,
        tracks,
        playlists,
        memberships,
    })
}
/// Delegate writes to rbox, keeping its default write safeguards enabled.
pub fn sync_playlists(request: &SyncRequest) -> Result<SyncResult> {
    let _lock = sync::lock(&request.sync_directory)?;
    anyhow::ensure!(!is_running()?, "Close Rekordbox before syncing playlists");
    let mut library = RboxLibrary(MasterDb::new(&request.database_path)?);
    sync::reconcile(&mut library, request.ownership.clone(), &request.playlists)
}

fn read_connection(path: &Path) -> Result<diesel::SqliteConnection> {
    let options = ConnectionOptions {
        open_mode: OpenMode::ReadOnly,
        busy_timeout: std::time::Duration::from_millis(250),
        ..ConnectionOptions::default()
    };
    Ok(rbox_masterdb::establish_connection(path, &options)?)
}

fn read_tracks(connection: &mut diesel::SqliteConnection) -> Result<Vec<Track>> {
    let tracks: Vec<Track> = diesel::sql_query(
        "SELECT c.ID AS id, c.FolderPath AS path, c.BPM AS bpm_hundredths, k.ScaleName AS key \
         FROM djmdContent c LEFT JOIN djmdKey k ON c.KeyID = k.ID \
         WHERE c.rb_local_deleted = 0",
    )
    .load(connection)?;
    Ok(tracks)
}

struct RboxLibrary(MasterDb);

fn playlist_info(playlist: rbox_masterdb::models::DjmdPlaylist) -> PlaylistInfo {
    let kind = match playlist.attribute {
        PlaylistType::Folder => PlaylistKind::Folder,
        PlaylistType::List => PlaylistKind::List,
        _ => PlaylistKind::Other,
    };
    PlaylistInfo {
        playlist: Playlist {
            id: playlist.id,
            name: playlist.name,
            parent_id: playlist.parent_id,
            is_folder: kind == PlaylistKind::Folder,
            is_regular: kind == PlaylistKind::List,
        },
        kind,
    }
}

impl Library for RboxLibrary {
    fn playlists(&mut self) -> Result<Vec<PlaylistInfo>> {
        Ok(self
            .0
            .get_playlists()?
            .into_iter()
            .filter(|p| p.rb_local_deleted == 0)
            .map(playlist_info)
            .collect())
    }
    fn members(&mut self, playlist: &str) -> Result<Vec<Entry>> {
        Ok(self
            .0
            .get_playlist_songs(playlist)?
            .into_iter()
            .map(|entry| Entry {
                id: entry.id,
                content_id: entry.content_id,
                deleted: entry.rb_local_deleted != 0,
            })
            .collect())
    }
    fn content_exists(&mut self, id: &str) -> Result<bool> {
        Ok(self
            .0
            .get_content_by_id(id)?
            .is_some_and(|track| track.rb_local_deleted == 0))
    }
    fn create_folder(&mut self) -> Result<Playlist> {
        Ok(playlist_info(self.0.create_playlist_folder("Cue".into(), None, None)?).playlist)
    }
    fn create_playlist(&mut self, tag: &str, folder: &str) -> Result<Playlist> {
        Ok(playlist_info(self.0.create_playlist(
            tag.into(),
            Some(folder.into()),
            None,
            None,
            None,
        )?)
        .playlist)
    }
    fn remove_playlist(&mut self, id: &str) -> Result<()> {
        self.0.delete_playlist(id)?;
        Ok(())
    }
    fn remove_member(&mut self, id: &str) -> Result<()> {
        self.0.delete_playlist_song(id)?;
        Ok(())
    }
    fn add_member(&mut self, playlist: &str, content: &str) -> Result<()> {
        self.0
            .create_playlist_song(&playlist.to_owned(), &content.to_owned(), None)?;
        Ok(())
    }
}
