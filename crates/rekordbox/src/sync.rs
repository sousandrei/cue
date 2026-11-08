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
    remove: bool,
}

pub(crate) fn reconcile(
    db: &mut impl Library,
    mut owner: Ownership,
    desired: &BTreeMap<String, BTreeSet<String>>,
) -> Result<SyncResult> {
    let existing = db.playlists()?;
    // The adapter returns active playlists only. Missing IDs can be adopted again by name.
    owner
        .playlists
        .retain(|_, owned| existing.iter().any(|p| p.playlist.id == owned.id));
    let owned_folder = owner
        .folder_id
        .as_ref()
        .and_then(|id| existing.iter().find(|p| p.playlist.id == *id));
    let folder = if let Some(folder) = owned_folder {
        ensure!(
            folder.kind == PlaylistKind::Folder
                && folder.playlist.parent_id == "root"
                && folder.playlist.name == "Cue",
            "The Cue playlist folder was moved or changed; resolve it before syncing"
        );
        Some(folder.playlist.clone())
    } else {
        owner.folder_id = None;
        let candidates: Vec<_> = existing
            .iter()
            .filter(|p| p.playlist.parent_id == "root" && p.playlist.name == "Cue")
            .collect();
        ensure!(
            candidates.len() <= 1,
            "Multiple root folders named Cue exist; resolve the ambiguity before syncing"
        );
        candidates
            .first()
            .map(|p| {
                ensure!(
                    p.kind == PlaylistKind::Folder,
                    "Cue already exists as a playlist, rather than a folder"
                );
                Ok(p.playlist.clone())
            })
            .transpose()?
    };
    if desired.is_empty() && owner.playlists.is_empty() {
        return Ok(SyncResult {
            ownership: owner,
            added: 0,
            removed: 0,
        });
    }
    // Resolve all names and validate all requested tracks before the first mutation.
    // Runtime failures can still leave partial progress; the next read reconciles it.
    let tags: BTreeSet<_> = desired
        .keys()
        .chain(owner.playlists.keys())
        .cloned()
        .collect();
    let mut plans = Vec::new();
    for tag in tags {
        let previous = owner
            .playlists
            .get(&tag)
            .and_then(|owned| existing.iter().find(|p| p.playlist.id == owned.id));
        let playlist = if let Some(previous) = previous {
            ensure!(
                Some(previous.playlist.parent_id.as_str())
                    == folder.as_ref().map(|p| p.id.as_str())
                    && previous.kind == PlaylistKind::List
                    && previous.playlist.name == tag,
                "A Cue playlist was moved, renamed, or changed; resolve it before syncing"
            );
            Some(previous.playlist.clone())
        } else {
            let candidates: Vec<_> = existing
                .iter()
                .filter(|p| {
                    Some(p.playlist.parent_id.as_str()) == folder.as_ref().map(|p| p.id.as_str())
                        && p.playlist.name == tag
                })
                .collect();
            ensure!(
                candidates.len() <= 1,
                "Multiple playlists named Cue/{tag} exist; resolve the ambiguity before syncing"
            );
            candidates
                .first()
                .map(|p| {
                    ensure!(
                        p.kind == PlaylistKind::List,
                        "Cue/{tag} is not a regular playlist"
                    );
                    Ok(p.playlist.clone())
                })
                .transpose()?
        };
        let target = desired.get(&tag).cloned().unwrap_or_default();
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
            remove: !desired.contains_key(&tag),
            tag,
            playlist,
            members,
            target,
        });
    }
    let folder = match folder {
        Some(folder) => folder,
        None => db.create_folder()?,
    };
    owner.folder_id = Some(folder.id.clone());
    let mut added = 0;
    let mut removed = 0;
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
        if plan.remove {
            db.remove_playlist(&playlist.id)?;
            owner.playlists.remove(&plan.tag);
        } else {
            owner
                .playlists
                .insert(plan.tag, OwnedPlaylist { id: playlist.id });
        }
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
