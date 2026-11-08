use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(
    any(target_os = "windows", target_os = "macos"),
    derive(diesel::QueryableByName)
)]
pub struct LibraryTrack {
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub id: String,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>))]
    pub path: Option<String>,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::BigInt>))]
    pub bpm_hundredths: Option<i64>,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>))]
    pub key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LibrarySnapshot {
    pub database_path: String,
    pub rekordbox_running: bool,
    pub tracks: Vec<LibraryTrack>,
    #[serde(default)]
    pub playlists: Vec<Playlist>,
    #[serde(default)]
    pub memberships: Vec<Membership>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(
    any(target_os = "windows", target_os = "macos"),
    derive(diesel::QueryableByName)
)]
pub struct Playlist {
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub id: String,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub name: String,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub parent_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(
    any(target_os = "windows", target_os = "macos"),
    derive(diesel::QueryableByName)
)]
pub struct Membership {
    #[serde(default)]
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub id: String,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub playlist_id: String,
    #[cfg_attr(any(target_os = "windows", target_os = "macos"), diesel(sql_type = diesel::sql_types::Text))]
    pub content_id: String,
}

#[derive(Default, Clone, Serialize, Deserialize)]
pub struct Ownership {
    pub folder_id: Option<String>,
    pub playlists: BTreeMap<String, OwnedPlaylist>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct OwnedPlaylist {
    pub id: String,
    pub members: BTreeSet<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub database_path: String,
    pub backup_directory: std::path::PathBuf,
    pub ownership: Ownership,
    pub playlists: BTreeMap<String, BTreeSet<String>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub ownership: Ownership,
    pub added: usize,
    pub removed: usize,
    pub backup_path: Option<std::path::PathBuf>,
}
