use super::*;

#[derive(Default)]
struct FakeLibrary {
    playlists: Vec<PlaylistInfo>,
    members: BTreeMap<String, Vec<Entry>>,
    content: BTreeSet<String>,
    calls: Vec<String>,
    fail_add: bool,
}

impl Library for FakeLibrary {
    fn playlists(&mut self) -> Result<Vec<PlaylistInfo>> {
        Ok(self.playlists.clone())
    }
    fn members(&mut self, id: &str) -> Result<Vec<Entry>> {
        Ok(self.members.get(id).cloned().unwrap_or_default())
    }
    fn content_exists(&mut self, id: &str) -> Result<bool> {
        Ok(self.content.contains(id))
    }
    fn create_folder(&mut self) -> Result<Playlist> {
        self.calls.push("folder".into());
        let info = info("folder", "Cue", "root", PlaylistKind::Folder);
        self.playlists.push(info.clone());
        Ok(info.playlist)
    }
    fn create_playlist(&mut self, tag: &str, folder: &str) -> Result<Playlist> {
        self.calls.push(format!("create:{tag}"));
        let info = info(&format!("list-{tag}"), tag, folder, PlaylistKind::List);
        self.playlists.push(info.clone());
        Ok(info.playlist)
    }
    fn remove_playlist(&mut self, id: &str) -> Result<()> {
        self.calls.push(format!("remove:{id}"));
        self.playlists.retain(|p| p.playlist.id != id);
        self.members.remove(id);
        Ok(())
    }
    fn remove_member(&mut self, id: &str) -> Result<()> {
        self.calls.push(format!("remove-member:{id}"));
        for entries in self.members.values_mut() {
            entries.retain(|e| e.id != id);
        }
        Ok(())
    }
    fn add_member(&mut self, playlist: &str, content: &str) -> Result<()> {
        self.calls.push(format!("add:{playlist}:{content}"));
        ensure!(!self.fail_add, "rbox write failed");
        self.members.entry(playlist.into()).or_default().push(entry(
            &format!("new-{content}"),
            content,
            false,
        ));
        Ok(())
    }
}

fn info(id: &str, name: &str, parent: &str, kind: PlaylistKind) -> PlaylistInfo {
    PlaylistInfo {
        playlist: Playlist {
            id: id.into(),
            name: name.into(),
            parent_id: parent.into(),
        },
        kind,
    }
}
fn entry(id: &str, content: &str, deleted: bool) -> Entry {
    Entry {
        id: id.into(),
        content_id: content.into(),
        deleted,
    }
}
fn desired() -> BTreeMap<String, BTreeSet<String>> {
    BTreeMap::from([("house".into(), BTreeSet::from(["track".into()]))])
}
fn existing() -> FakeLibrary {
    FakeLibrary {
        playlists: vec![
            info("folder", "Cue", "root", PlaylistKind::Folder),
            info("list", "house", "folder", PlaylistKind::List),
        ],
        content: BTreeSet::from(["track".into()]),
        ..Default::default()
    }
}

#[test]
fn adopts_by_name_and_retries_without_duplicate_playlists() {
    let mut db = FakeLibrary {
        content: BTreeSet::from(["track".into()]),
        fail_add: true,
        ..Default::default()
    };
    assert!(reconcile(&mut db, Ownership::default(), &desired()).is_err());
    assert_eq!(db.playlists.len(), 2);
    db.fail_add = false;
    let result = reconcile(&mut db, Ownership::default(), &desired()).unwrap();
    assert_eq!(db.playlists.len(), 2);
    assert_eq!(result.ownership.playlists["house"].id, "list-house");
    db.calls.clear();
    let repeated = reconcile(&mut db, result.ownership, &desired()).unwrap();
    assert_eq!((repeated.added, repeated.removed), (0, 0));
    assert!(db.calls.is_empty());
}

#[test]
fn deleted_entries_do_not_satisfy_membership_or_displace_active_entries() {
    for members in [
        vec![entry("dead", "track", true)],
        vec![entry("dead", "track", true), entry("live", "track", false)],
    ] {
        let active = members.iter().any(|e| !e.deleted);
        let mut db = existing();
        db.members.insert("list".into(), members);
        let result = reconcile(&mut db, Ownership::default(), &desired()).unwrap();
        assert_eq!(result.added, usize::from(!active));
        assert_eq!(db.members["list"].len(), 1);
        assert!(!db.members["list"][0].deleted);
        if active {
            assert_eq!(db.members["list"][0].id, "live");
        }
    }
}

#[test]
fn reconciles_exact_membership_and_removes_disappeared_tags() {
    let mut db = existing();
    db.playlists
        .push(info("other", "Personal", "root", PlaylistKind::List));
    db.members.insert(
        "list".into(),
        vec![
            entry("keep", "track", false),
            entry("duplicate", "track", false),
            entry("extra", "untagged", false),
        ],
    );
    let result = reconcile(&mut db, Ownership::default(), &desired()).unwrap();
    assert_eq!((result.added, result.removed), (0, 2));
    let removed = reconcile(&mut db, result.ownership, &BTreeMap::new()).unwrap();
    assert!(removed.ownership.playlists.is_empty());
    assert!(db.playlists.iter().any(|p| p.playlist.id == "other"));
    assert!(!db.calls.iter().any(|call| call.contains("other")));
}

#[test]
fn resolves_all_conflicts_and_missing_tracks_before_mutating() {
    let mut db = existing();
    db.playlists
        .push(info("conflict", "z-tag", "folder", PlaylistKind::Other));
    let mut targets = desired();
    targets.insert("z-tag".into(), BTreeSet::new());
    assert!(reconcile(&mut db, Ownership::default(), &targets).is_err());
    assert!(db.calls.is_empty());
    db.content.clear();
    assert!(reconcile(&mut db, Ownership::default(), &desired()).is_err());
    assert!(db.calls.is_empty());
}

#[test]
fn recreates_missing_owned_ids_but_rejects_renamed_owned_playlists() {
    let mut db = existing();
    let owner = Ownership {
        folder_id: Some("missing".into()),
        playlists: BTreeMap::from([(
            "house".into(),
            OwnedPlaylist {
                id: "missing-list".into(),
            },
        )]),
    };
    let result = reconcile(&mut db, owner, &desired()).unwrap();
    assert_eq!(result.ownership.folder_id.as_deref(), Some("folder"));
    db.calls.clear();
    db.playlists[1].playlist.name = "Renamed".into();
    assert!(reconcile(&mut db, result.ownership, &desired()).is_err());
    assert!(db.calls.is_empty());
}

#[test]
fn rejects_duplicate_names_without_mutations() {
    let mut db = existing();
    db.playlists
        .push(info("duplicate", "house", "folder", PlaylistKind::List));
    assert!(reconcile(&mut db, Ownership::default(), &desired()).is_err());
    assert!(db.calls.is_empty());
}

#[test]
fn second_request_waits_until_the_first_releases_its_lock() {
    let directory = tempfile::tempdir().unwrap();
    let first = lock(directory.path()).unwrap();
    assert!(lock(directory.path()).is_err());
    drop(first);
    assert!(lock(directory.path()).is_ok());
}
