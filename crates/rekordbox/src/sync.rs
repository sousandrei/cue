use anyhow::{bail, ensure, Context, Result};
use rbox_core::is_rekordbox_running;
use rbox_masterdb::{MasterDb, PlaylistType};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use crate::{OwnedPlaylist, Ownership, SyncRequest as Request, SyncResult as Response};

fn checksum(path: &Path) -> Result<Vec<u8>> {
    let mut file = File::open(path)?;
    let mut hash = Sha256::new();
    let mut bytes = [0; 65536];
    loop {
        let count = file.read(&mut bytes)?;
        if count == 0 {
            break;
        }
        hash.update(&bytes[..count]);
    }
    Ok(hash.finalize().to_vec())
}

fn replace(from: &Path, to: &Path) -> Result<()> {
    let mut temporary =
        tempfile::NamedTempFile::new_in(to.parent().context("No parent directory")?)?;
    std::io::copy(&mut File::open(from)?, temporary.as_file_mut())?;
    temporary.as_file_mut().flush()?;
    temporary.as_file().sync_all()?;
    temporary.persist(to).map_err(|error| error.error)?;
    Ok(())
}

fn require_closed(path: &Path) -> Result<()> {
    ensure!(
        !is_rekordbox_running(),
        "Close Rekordbox before syncing playlists"
    );
    for suffix in ["-wal", "-journal"] {
        let file = PathBuf::from(format!("{}{suffix}", path.display()));
        ensure!(
            !file.exists() || file.metadata()?.len() == 0,
            "Rekordbox has pending database changes. Open and close it, then try again"
        );
    }
    Ok(())
}

fn playlist_exists(db: &mut MasterDb, id: &str) -> Result<bool> {
    Ok(db
        .get_playlist_by_id(id)?
        .is_some_and(|playlist| playlist.rb_local_deleted == 0))
}

/// Forget owned IDs that no longer exist in the library. Those playlists are
/// then adopted by name or recreated, so stale ownership never blocks a sync.
fn forget_missing(db: &mut MasterDb, owner: &mut Ownership) -> Result<()> {
    if let Some(id) = owner.folder_id.clone() {
        if !playlist_exists(db, &id)? {
            owner.folder_id = None;
        }
    }
    let mut missing = Vec::new();
    for (tag, playlist) in &owner.playlists {
        if !playlist_exists(db, &playlist.id)? {
            missing.push(tag.clone());
        }
    }
    for tag in missing {
        owner.playlists.remove(&tag);
    }
    Ok(())
}

pub fn apply_to_copy(
    path: &Path,
    mut owner: Ownership,
    desired: &BTreeMap<String, BTreeSet<String>>,
) -> Result<Response> {
    let mut db = MasterDb::new(path)?;
    forget_missing(&mut db, &mut owner)?;
    let folder = match owner.folder_id.as_deref() {
        Some(id) => {
            let folder = db.get_playlist_by_id(id)?.context(
                "Cue's playlist folder was removed; refresh the connection before syncing",
            )?;
            ensure!(
                folder.attribute == PlaylistType::Folder
                    && folder.parent_id == "root"
                    && folder.name == "Cue",
                "The Cue playlist folder was moved or changed; no playlists were updated"
            );
            folder
        }
        None => {
            if desired.is_empty() {
                return Ok(Response {
                    ownership: owner,
                    added: 0,
                    removed: 0,
                    backup_path: None,
                });
            }
            let existing = db.get_playlists()?;
            let containers: Vec<_> = existing
                .iter()
                .filter(|playlist| {
                    playlist.parent_id == "root"
                        && playlist.name == "Cue"
                        && playlist.rb_local_deleted == 0
                })
                .collect();
            ensure!(
                containers.len() <= 1,
                "Multiple root folders named Cue exist; resolve the folder ambiguity before syncing"
            );
            let folder = if let Some(folder) = containers.first() {
                ensure!(
                    folder.attribute == PlaylistType::Folder,
                    "Cue already exists as a playlist, rather than a folder"
                );
                (*folder).clone()
            } else {
                db.create_playlist_folder("Cue".into(), None, None)?
            };
            owner.folder_id = Some(folder.id.clone());
            folder
        }
    };
    let mut added = 0;
    let mut removed = 0;
    let tags: BTreeSet<String> = desired
        .keys()
        .chain(owner.playlists.keys())
        .cloned()
        .collect();
    for tag in tags {
        let target = desired.get(&tag).cloned().unwrap_or_default();
        let previous = owner.playlists.get(&tag).cloned();
        let playlist = match previous.as_ref() {
            Some(previous) => {
                let playlist = db
                    .get_playlist_by_id(&previous.id)?
                    .context("A Cue playlist was removed; refresh before syncing")?;
                ensure!(
                    playlist.parent_id == folder.id && playlist.attribute == PlaylistType::List,
                    "A Cue playlist was moved or changed; no playlists were updated"
                );
                ensure!(
                    playlist.name == tag,
                    "A Cue playlist was renamed in Rekordbox; resolve the name before syncing"
                );
                playlist
            }
            None => {
                let existing = db.get_playlists()?;
                let candidates: Vec<_> = existing
                    .iter()
                    .filter(|playlist| {
                        playlist.parent_id == folder.id
                            && playlist.name == tag
                            && playlist.rb_local_deleted == 0
                    })
                    .collect();
                ensure!(
                    candidates.len() <= 1,
                    "Multiple playlists named Cue/{tag} exist; resolve the ambiguity before syncing"
                );
                if let Some(playlist) = candidates.first() {
                    ensure!(playlist.attribute == PlaylistType::List,
                        "Cue/{tag} is a folder or an intelligent playlist; only regular playlists can be managed");
                    (*playlist).clone()
                } else {
                    db.create_playlist(tag.clone(), Some(folder.id.clone()), None, None, None)?
                }
            }
        };
        let current = db.get_playlist_songs(&playlist.id)?;
        let current_ids: BTreeSet<String> = current
            .iter()
            .map(|entry| entry.content_id.clone())
            .collect();
        let mut retained = BTreeSet::new();
        for entry in &current {
            if !target.contains(&entry.content_id) || !retained.insert(&entry.content_id) {
                db.delete_playlist_song(&entry.id)?;
                removed += 1;
            }
        }
        for id in target.difference(&current_ids) {
            ensure!(
                db.get_content_by_id(id)?.is_some(),
                "A tagged track is no longer in Rekordbox; refresh before syncing"
            );
            db.create_playlist_song(&playlist.id, id, None)?;
            added += 1;
        }
        // Cue owns the full membership; removing the tag also removes its playlist.
        if !desired.contains_key(&tag) && db.get_playlist_songs(&playlist.id)?.is_empty() {
            db.delete_playlist(&playlist.id)?;
            owner.playlists.remove(&tag);
        } else {
            owner.playlists.insert(
                tag,
                OwnedPlaylist {
                    id: playlist.id,
                    members: target,
                },
            );
        }
    }
    // rbox also maintains Rekordbox's internal masterPlaylists6.xml. Verify it can
    // be read and written before any staged files are installed into the library.
    let xml = db
        .playlist_xml_path()
        .context("Rekordbox's internal playlist index is missing")?;
    rbox_masterdb::MasterPlaylistXml::load(&xml).dump()?;
    drop(db);
    require_closed(path)?;
    Ok(Response {
        ownership: owner,
        added,
        removed,
        backup_path: None,
    })
}

/// Hold an OS lock that serializes Cue syncs. The OS releases it if Cue exits,
/// so an interrupted sync never blocks later ones.
fn lock(directory: &Path) -> Result<File> {
    let file = File::options()
        .create(true)
        .truncate(false)
        .write(true)
        .open(directory.join("sync.lock"))?;
    match file.try_lock() {
        Ok(()) => Ok(file),
        Err(fs::TryLockError::WouldBlock) => bail!("Another Cue sync is active"),
        Err(fs::TryLockError::Error(error)) => Err(error.into()),
    }
}

pub fn sync(source: &Path, request: Request) -> Result<Response> {
    ensure!(
        source.canonicalize()? == Path::new(&request.database_path).canonicalize()?,
        "The selected Rekordbox library changed; refresh before syncing"
    );
    fs::create_dir_all(&request.backup_directory)?;
    let _lock = lock(&request.backup_directory)?;
    require_closed(source)?;
    let parent = source.parent().context("No Rekordbox library directory")?;
    let index = parent.join("masterPlaylists6.xml");
    ensure!(
        index.is_file(),
        "Rekordbox's internal playlist index is missing"
    );
    let original_hash = checksum(source)?;
    let index_hash = checksum(&index)?;
    let backup = tempfile::Builder::new()
        .prefix("cue-rekordbox-")
        .tempdir_in(&request.backup_directory)?
        .keep();
    fs::copy(source, backup.join("master.db"))?;
    fs::copy(&index, backup.join("masterPlaylists6.xml"))?;
    fs::write(
        backup.join("ownership.json"),
        serde_json::to_vec_pretty(&request.ownership)?,
    )?;
    let stage = tempfile::Builder::new()
        .prefix(".cue-stage-")
        .tempdir_in(parent)?;
    let staged_db = stage.path().join("master.db");
    fs::copy(backup.join("master.db"), &staged_db)?;
    fs::copy(
        backup.join("masterPlaylists6.xml"),
        stage.path().join("masterPlaylists6.xml"),
    )?;
    let mut result = apply_to_copy(&staged_db, request.ownership, &request.playlists)?;
    super::validate_database(&staged_db)?;
    require_closed(source)?;
    ensure!(
        checksum(source)? == original_hash && checksum(&index)? == index_hash,
        "Rekordbox's library changed during sync; no staged changes were applied"
    );
    // Cue saves the returned ownership after this call. If Cue exits before
    // that, the next sync adopts the Cue folder and playlists by name.
    let install = replace(&staged_db, source)
        .and_then(|()| replace(&stage.path().join("masterPlaylists6.xml"), &index));
    if let Err(error) = install {
        let restored = replace(&backup.join("master.db"), source)
            .and_then(|()| replace(&backup.join("masterPlaylists6.xml"), &index));
        if let Err(restore_error) = restored {
            bail!(
                "Playlist update failed ({error}); restore failed ({restore_error}). Backup: {}",
                backup.display()
            );
        }
        return Err(error.context("Playlist update failed; the original library was restored"));
    }
    result.backup_path = Some(backup);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn second_lock_fails_until_the_first_is_released() {
        let directory = tempfile::tempdir().unwrap();
        let first = lock(directory.path()).unwrap();
        assert!(lock(directory.path()).is_err());
        drop(first);
        assert!(lock(directory.path()).is_ok());
    }
}
