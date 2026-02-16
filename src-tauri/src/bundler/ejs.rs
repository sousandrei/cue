use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use super::{SetupProgressPayload, EJS_VERSION};

pub async fn ensure_ejs(app: &AppHandle) -> Result<(), anyhow::Error> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;

    let bin_dir = app_data_dir.join("bin");
    let components_dir = bin_dir.join("components");
    let ejs_dir = components_dir.join("ejs");
    let version_path = components_dir.join("ejs.version");

    let current_version = if version_path.exists() {
        fs::read_to_string(&version_path).ok()
    } else {
        None
    };

    if ejs_dir.exists() {
        if let Some(v) = current_version {
            if v.trim() == EJS_VERSION {
                return Ok(());
            }
        }
        let _ = fs::remove_dir_all(&ejs_dir);
    }

    if !components_dir.exists() {
        fs::create_dir_all(&components_dir)?;
    }

    let url = format!(
        "https://github.com/yt-dlp/ejs/archive/refs/tags/{}.zip",
        EJS_VERSION
    );
    download_ejs_zip(app, &url, &ejs_dir, &version_path).await
}

async fn download_ejs_zip(
    app: &AppHandle,
    url: &str,
    ejs_dir: &PathBuf,
    version_path: &PathBuf,
) -> Result<(), anyhow::Error> {
    let bytes = super::download_with_progress(app, url, "Downloading yt-dlp-ejs...").await?;

    let reader = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader)?;

    if !ejs_dir.exists() {
        fs::create_dir_all(ejs_dir)?;
    }

    let total_files = archive.len();
    for i in 0..total_files {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        let parts: Vec<&str> = name.split('/').collect();

        // GitHub zips have a root folder (e.g., ejs-0.4.0/)
        if parts.len() > 1 {
            let relative_path = parts[1..].join("/");
            if relative_path.is_empty() {
                continue;
            }
            let outpath = ejs_dir.join(relative_path);

            if file.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = fs::File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }
        }

        let op_percent = ((i + 1) as f64 / total_files as f64) * 100.0;

        let _ = app.emit(
            "setup://progress",
            SetupProgressPayload {
                status: "Extracting yt-dlp-ejs...".into(),
                progress: op_percent,
            },
        );
    }

    tokio::fs::write(version_path, EJS_VERSION).await?;

    Ok(())
}

pub fn check_health(app: &AppHandle) -> bool {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return false,
    };
    let bin_dir = app_data_dir.join("bin");
    let components_dir = bin_dir.join("components");
    let ejs_dir = components_dir.join("ejs");
    let version_path = components_dir.join("ejs.version");

    if !ejs_dir.exists() || !version_path.exists() {
        return false;
    }

    if let Ok(v) = fs::read_to_string(&version_path) {
        if v.trim() != EJS_VERSION {
            return false;
        }
    } else {
        return false;
    }

    true
}
