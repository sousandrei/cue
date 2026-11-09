//! Read Rekordbox metadata and reconcile Cue playlists on Windows and macOS.
mod analysis;
#[cfg(any(test, target_os = "windows", target_os = "macos"))]
mod sync;
mod types;
pub use analysis::{read_analysis, AnalysisBeat, TrackAnalysis};
pub use types::*;
#[cfg(any(target_os = "windows", target_os = "macos"))]
mod native;
#[cfg(any(target_os = "windows", target_os = "macos"))]
pub use native::{is_running, read_library, read_library_at, read_track_analysis, sync_playlists};
pub const fn supported() -> bool {
    cfg!(any(target_os = "windows", target_os = "macos"))
}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn is_running() -> anyhow::Result<bool> {
    anyhow::bail!("Rekordbox integration is available only on Windows and macOS")
}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn read_library() -> anyhow::Result<LibrarySnapshot> {
    anyhow::bail!("Rekordbox integration is available only on Windows and macOS")
}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn read_library_at(_: &std::path::Path) -> anyhow::Result<LibrarySnapshot> {
    read_library()
}
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn sync_playlists(_: &SyncRequest) -> anyhow::Result<SyncResult> {
    anyhow::bail!("Rekordbox integration is available only on Windows and macOS")
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn read_track_analysis(_: &str) -> anyhow::Result<Option<TrackAnalysis>> {
    Ok(None)
}
