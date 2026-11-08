#![cfg(any(target_os = "windows", target_os = "macos"))]

use anyhow::{Context, Result};
use cue_rekordbox::{read_library, read_library_at, sync_playlists, Ownership, SyncRequest};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::Path;

fn checksum(path: &Path) -> Result<Vec<u8>> {
    Ok(Sha256::digest(fs::read(path)?).to_vec())
}

/// Opt in with `bun run test:rekordbox`. Only the temporary copy is passed to sync.
#[test]
#[ignore = "requires a closed Rekordbox library with at least two imported tracks"]
fn library_round_trip() -> Result<()> {
    let source = read_library()?;
    anyhow::ensure!(
        !source.rekordbox_running,
        "Close Rekordbox before this test"
    );
    let original = Path::new(&source.database_path);
    let original_index = original
        .parent()
        .context("No library directory")?
        .join("masterPlaylists6.xml");
    let original_hash = checksum(original)?;
    let index_hash = checksum(&original_index)?;
    let artifacts = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../artifacts");
    fs::create_dir_all(&artifacts)?;
    let artifacts = artifacts.canonicalize()?;
    let fixture = tempfile::Builder::new()
        .prefix("rekordbox-roundtrip-")
        .tempdir_in(&artifacts)?
        .keep();
    eprintln!("Test copy (retained on failure): {}", fixture.display());
    let database = fixture.join("master.db");
    fs::copy(original, &database)?;
    fs::copy(&original_index, fixture.join("masterPlaylists6.xml"))?;
    let before = read_library_at(&database)?;
    let mut tracks = before.tracks.iter().filter(|track| track.path.is_some());
    let first = tracks.next().context("Import at least two tracks")?;
    let second = tracks.next().context("Import at least two tracks")?;
    let tag = format!(
        "Cue integration {}",
        fixture.file_name().unwrap().to_string_lossy()
    );
    let mut request = SyncRequest {
        database_path: database.to_string_lossy().into_owned(),
        backup_directory: fixture.join("backups"),
        ownership: Ownership::default(),
        playlists: BTreeMap::from([(tag.clone(), BTreeSet::from([first.id.clone()]))]),
    };
    let created = sync_playlists(&request)?;
    let playlist_id = created.ownership.playlists[&tag].id.clone();
    let after = read_library_at(&database)?;
    assert!(after.playlists.iter().any(|playlist| Some(&playlist.id)
        == created.ownership.folder_id.as_ref()
        && playlist.name == "Cue"));
    assert!(after
        .memberships
        .iter()
        .any(|member| member.playlist_id == playlist_id && member.content_id == first.id));
    assert_eq!(after.tracks, before.tracks);
    for playlist in &before.playlists {
        assert!(after.playlists.contains(playlist));
    }
    for member in &before.memberships {
        assert!(after.memberships.contains(member));
    }

    request.ownership = created.ownership;
    let repeated = sync_playlists(&request)?;
    assert_eq!((repeated.added, repeated.removed), (0, 0));
    // Adopt the existing playlist, retain its ID, and replace its contents.
    request.ownership = Ownership::default();
    request.backup_directory = fixture.join("adopted");
    request
        .playlists
        .insert(tag.clone(), BTreeSet::from([second.id.clone()]));
    let adopted = sync_playlists(&request)?;
    assert_eq!(adopted.ownership.playlists[&tag].id, playlist_id);
    assert_eq!((adopted.added, adopted.removed), (1, 1));
    let adopted_snapshot = read_library_at(&database)?;
    let contents: Vec<_> = adopted_snapshot
        .memberships
        .iter()
        .filter(|member| member.playlist_id == playlist_id)
        .map(|member| &member.content_id)
        .collect();
    assert_eq!(contents, vec![&second.id]);
    assert_eq!(
        adopted_snapshot
            .playlists
            .iter()
            .filter(
                |playlist| Some(&playlist.parent_id) == adopted.ownership.folder_id.as_ref()
                    && playlist.name == tag
            )
            .count(),
        1
    );
    request.ownership = adopted.ownership;
    let repeated = sync_playlists(&request)?;
    assert_eq!((repeated.added, repeated.removed), (0, 0));

    // Add a track externally, then reconcile using Cue's older ownership state.
    let mut external = request.clone();
    external.ownership = repeated.ownership.clone();
    external.playlists.insert(
        tag.clone(),
        BTreeSet::from([first.id.clone(), second.id.clone()]),
    );
    sync_playlists(&external)?;
    request.ownership = repeated.ownership;
    let reconciled = sync_playlists(&request)?;
    assert_eq!((reconciled.added, reconciled.removed), (0, 1));
    let reconciled_snapshot = read_library_at(&database)?;
    let contents: Vec<_> = reconciled_snapshot
        .memberships
        .iter()
        .filter(|member| member.playlist_id == playlist_id)
        .map(|member| &member.content_id)
        .collect();
    assert_eq!(contents, vec![&second.id]);

    request.ownership = reconciled.ownership;
    request.playlists.clear();
    let cleared = sync_playlists(&request)?;
    assert_eq!(cleared.removed, 1);
    let final_snapshot = read_library_at(&database)?;
    assert!(!final_snapshot
        .playlists
        .iter()
        .any(|playlist| playlist.id == playlist_id));
    assert!(!final_snapshot
        .memberships
        .iter()
        .any(|member| member.playlist_id == playlist_id));
    assert_eq!(final_snapshot.tracks, before.tracks);
    for playlist in &before.playlists {
        assert!(final_snapshot.playlists.contains(playlist));
    }
    for member in &before.memberships {
        assert!(final_snapshot.memberships.contains(member));
    }
    assert_eq!(
        checksum(original)?,
        original_hash,
        "The real database changed"
    );
    assert_eq!(
        checksum(&original_index)?,
        index_hash,
        "The real playlist index changed"
    );
    let cleanup = fixture.canonicalize()?;
    anyhow::ensure!(
        cleanup.parent() == Some(artifacts.as_path())
            && cleanup
                .file_name()
                .is_some_and(|name| name.to_string_lossy().starts_with("rekordbox-roundtrip-")),
        "Refusing to remove a directory outside the generated test fixtures"
    );
    fs::remove_dir_all(cleanup)?;
    Ok(())
}
