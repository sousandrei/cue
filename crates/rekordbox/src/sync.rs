//! Cue's playlist policy. Database operations and their safeguards belong to rbox.
use anyhow::{bail, ensure, Context, Result};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::path::Path;

use crate::{OwnedPlaylist, Ownership, Playlist, SyncResult};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum PlaylistKind {
    Folder,
    List,
    Other,
}

#[derive(Clone)]
pub(crate) struct PlaylistInfo {
    pub playlist: Playlist,
    pub kind: PlaylistKind,
}

#[derive(Clone)]
pub(crate) struct Entry {
    pub id: String,
    pub content_id: String,
    pub deleted: bool,
}

/// Small boundary for testing Cue's decisions without opening a Rekordbox library.
pub(crate) trait Library {
    fn playlists(&mut self) -> Result<Vec<PlaylistInfo>>;
    fn members(&mut self, playlist: &str) -> Result<Vec<Entry>>;
    fn content_exists(&mut self, id: &str) -> Result<bool>;
    fn create_folder(&mut self) -> Result<Playlist>;
    fn create_playlist(&mut self, tag: &str, folder: &str) -> Result<Playlist>;
    fn remove_playlist(&mut self, id: &str) -> Result<()>;
    fn remove_member(&mut self, id: &str) -> Result<()>;
    fn add_member(&mut self, playlist: &str, content: &str) -> Result<()>;
}

struct PlannedPlaylist {
    tag: String,
    playlist: Option<Playlist>,
    members: Vec<Entry>,
    target: BTreeSet<String>,
}

pub(crate) fn reconcile(
    db: &mut impl Library,
    mut owner: Ownership,
    desired: &BTreeMap<String, BTreeSet<String>>,
) -> Result<SyncResult> {
    let existing = db.playlists()?;
    let folders: Vec<_> = existing
        .iter()
        .filter(|p| p.playlist.parent_id == "root" && p.playlist.name == "Cue")
        .collect();
    ensure!(
        folders.len() <= 1,
        "Multiple root folders named Cue exist; resolve the ambiguity before syncing"
    );
    let folder = folders
        .first()
        .map(|p| {
            ensure!(
                p.kind == PlaylistKind::Folder,
                "Cue already exists as a playlist, rather than a folder"
            );
            Ok(p.playlist.clone())
        })
        .transpose()?;
    if folder.is_none() && desired.is_empty() {
        return Ok(SyncResult {
            ownership: Ownership::default(),
            added: 0,
            removed: 0,
        });
    }
    let children: Vec<_> = existing
        .iter()
        .filter(|p| Some(p.playlist.parent_id.as_str()) == folder.as_ref().map(|p| p.id.as_str()))
        .collect();
    // Cue administers every child of this folder. Stored IDs only prefer which
    // regular playlist to retain when duplicate names exist; they never limit scope.
    let mut plans = Vec::new();
    let mut retained_playlists = BTreeSet::new();
    for tag in desired.keys() {
        let mut candidates: Vec<_> = children
            .iter()
            .filter(|p| p.playlist.name == *tag && p.kind == PlaylistKind::List)
            .collect();
        candidates.sort_by_key(|p| &p.playlist.id);
        let preferred = owner
            .playlists
            .get(tag)
            .and_then(|owned| candidates.iter().find(|p| p.playlist.id == owned.id));
        let playlist = preferred
            .or_else(|| candidates.first())
            .map(|p| p.playlist.clone());
        if let Some(playlist) = &playlist {
            retained_playlists.insert(playlist.id.clone());
        }
        let target = desired.get(tag).cloned().unwrap_or_default();
        for id in &target {
            ensure!(
                db.content_exists(id)?,
                "A tagged track is no longer in Rekordbox; refresh before syncing"
            );
        }
        let members = match &playlist {
            Some(playlist) => db.members(&playlist.id)?,
            None => Vec::new(),
        };
        plans.push(PlannedPlaylist {
            tag: tag.clone(),
            playlist,
            members,
            target,
        });
    }
    // Validate desired tracks and read retained memberships before mutating.
    // rbox handles deletion of any descendants of an unwanted folder.
    let mut removed = 0;
    for child in children {
        if !retained_playlists.contains(&child.playlist.id) {
            db.remove_playlist(&child.playlist.id)?;
            removed += 1;
        }
    }
    let folder = match folder {
        Some(folder) => folder,
        None => db.create_folder()?,
    };
    owner = Ownership {
        folder_id: Some(folder.id.clone()),
        playlists: BTreeMap::new(),
    };
    let mut added = 0;
    for plan in plans {
        let playlist = match plan.playlist {
            Some(playlist) => playlist,
            None => db.create_playlist(&plan.tag, &folder.id)?,
        };
        let mut retained = BTreeSet::new();
        for entry in plan.members {
            // rbox includes tombstones in get_playlist_songs. They do not satisfy
            // a desired membership and must not win over an active duplicate.
            if entry.deleted
                || !plan.target.contains(&entry.content_id)
                || !retained.insert(entry.content_id)
            {
                db.remove_member(&entry.id)?;
                removed += 1;
            }
        }
        for id in plan.target.difference(&retained) {
            db.add_member(&playlist.id, id)?;
            added += 1;
        }
        owner
            .playlists
            .insert(plan.tag, OwnedPlaylist { id: playlist.id });
    }
    Ok(SyncResult {
        ownership: owner,
        added,
        removed,
    })
}

/// Serialize Cue requests only. This is not a lock on Rekordbox or its database.
pub(crate) fn lock(directory: &Path) -> Result<File> {
    fs::create_dir_all(directory)?;
    let file = File::options()
        .create(true)
        .truncate(false)
        .write(true)
        .open(directory.join("sync.lock"))?;
    match file.try_lock() {
        Ok(()) => Ok(file),
        Err(fs::TryLockError::WouldBlock) => bail!("Another Cue sync is active"),
        Err(fs::TryLockError::Error(error)) => Err(error).context("Could not lock Cue sync"),
    }
}

#[cfg(test)]
mod tests;
