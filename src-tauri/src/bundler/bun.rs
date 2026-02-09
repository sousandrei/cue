use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::bundler::SetupProgressPayload;

pub async fn ensure_bun<R: Runtime>(
    app: &AppHandle<R>,
    target_version: &str,
) -> Result<PathBuf, anyhow::Error> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;

    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "bun.exe"
    } else {
        "bun"
    };
    let bun_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("bun.version");

    let current_version = if version_path.exists() {
        fs::read_to_string(&version_path).ok()
    } else {
        None
    };

    if bun_path.exists() {
        if let Some(v) = current_version {
            if v.trim() == target_version {
                return Ok(bun_path);
            }
        }
    }

    let arch = if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x64"
    };

    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        let mac_arch = if cfg!(target_arch = "aarch64") {
            "aarch64"
        } else {
            "x64"
        };
        return download_bun_zip(
            app,
            &format!(
                "https://github.com/oven-sh/bun/releases/download/bun-v{}/bun-darwin-{}.zip",
                target_version, mac_arch
            ),
            &bun_path,
            &version_path,
            target_version,
        )
        .await;
    } else {
        "linux"
    };

    let url = format!(
        "https://github.com/oven-sh/bun/releases/download/bun-v{}/bun-{}-{}.zip",
        target_version, platform, arch
    );

    download_bun_zip(app, &url, &bun_path, &version_path, target_version).await
}

async fn download_bun_zip<R: Runtime>(
    app: &AppHandle<R>,
    url: &str,
    bun_path: &PathBuf,
    version_path: &PathBuf,
    target_version: &str,
) -> Result<PathBuf, anyhow::Error> {
    let bytes = crate::bundler::download_with_progress(app, url, "Downloading Bun...").await?;

    let reader = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name().ends_with("bun") || file.name().ends_with("bun.exe") {
            let total_extract = file.size();
            let mut outfile = fs::File::create(bun_path)?;

            let mut extracted = 0;
            let mut chunk_buf = [0u8; 8192];
            while let Ok(n) = std::io::Read::read(&mut file, &mut chunk_buf) {
                if n == 0 {
                    break;
                }
                std::io::Write::write_all(&mut outfile, &chunk_buf[..n])?;
                extracted += n as u64;

                let op_percent = (extracted as f64 / total_extract as f64) * 100.0;

                let _ = app.emit(
                    "setup://progress",
                    SetupProgressPayload {
                        status: "Extracting Bun...".into(),
                        progress: op_percent,
                    },
                );
            }
            break;
        }
    }

    tokio::fs::write(version_path, target_version).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(bun_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(bun_path, perms)?;
    }

    let _ = app.emit(
        "setup://progress",
        SetupProgressPayload {
            status: "Bun ready".into(),
            progress: 100.0,
        },
    );

    Ok(bun_path.clone())
}

pub fn check_health<R: Runtime>(app: &AppHandle<R>, target_version: &str) -> bool {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return false,
    };
    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "bun.exe"
    } else {
        "bun"
    };
    let bun_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("bun.version");

    if !bun_path.exists() || !version_path.exists() {
        return false;
    }

    if let Ok(v) = fs::read_to_string(&version_path) {
        if v.trim() != target_version {
            return false;
        }
    } else {
        return false;
    }

    true
}
