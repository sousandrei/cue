use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use super::{SetupProgressPayload, YT_DLP_VERSION};

pub async fn ensure_ytdlp(app: &AppHandle) -> Result<PathBuf, anyhow::Error> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;

    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)?;
    }

    let bin_dir = app_data_dir.join("bin");
    if !bin_dir.exists() {
        fs::create_dir_all(&bin_dir)?;
    }

    let binary_name = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };

    let ytdlp_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("yt-dlp.version");

    // Check version
    let current_version = if version_path.exists() {
        fs::read_to_string(&version_path).ok()
    } else {
        None
    };

    if ytdlp_path.exists() {
        if let Some(v) = current_version {
            if v.trim() == YT_DLP_VERSION {
                return Ok(ytdlp_path);
            }
        }
    }

    let url = if cfg!(target_os = "windows") {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp.exe",
            YT_DLP_VERSION
        )
    } else if cfg!(target_os = "macos") {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp_macos",
            YT_DLP_VERSION
        )
    } else {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp_linux",
            YT_DLP_VERSION
        )
    };

    let buffer = super::download_with_progress(app, &url, "Downloading yt-dlp...").await?;

    let temp_path = ytdlp_path.with_extension("tmp");
    tokio::fs::write(&temp_path, buffer).await?;

    // Rename to final path
    tokio::fs::rename(&temp_path, &ytdlp_path).await?;

    // Write version file
    tokio::fs::write(&version_path, YT_DLP_VERSION).await?;

    // Make executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&ytdlp_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&ytdlp_path, perms)?;
    }

    let _ = app.emit(
        "setup://progress",
        SetupProgressPayload {
            status: "yt-dlp ready".into(),
            progress: 50.0,
        },
    );

    Ok(ytdlp_path)
}

pub fn check_health(app: &AppHandle) -> bool {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return false,
    };
    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };
    let ytdlp_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("yt-dlp.version");

    if !ytdlp_path.exists() || !version_path.exists() {
        return false;
    }

    if let Ok(v) = fs::read_to_string(&version_path) {
        if v.trim() != YT_DLP_VERSION {
            return false;
        }
    } else {
        return false;
    }

    true
}
