use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use super::{SetupProgressPayload, FFMPEG_VERSION};

pub async fn ensure_ffmpeg(app: &AppHandle) -> Result<PathBuf, anyhow::Error> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;

    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };

    let ffmpeg_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("ffmpeg.version");

    // Check version
    let current_version = if version_path.exists() {
        fs::read_to_string(&version_path).ok()
    } else {
        None
    };

    if ffmpeg_path.exists() {
        if let Some(v) = current_version {
            if v.trim() == FFMPEG_VERSION {
                return Ok(ffmpeg_path);
            }
        }
    }

    let _ = app.emit(
        "setup://progress",
        SetupProgressPayload {
            status: "Downloading ffmpeg...".into(),
            progress: 0.0,
        },
    );

    let url = if cfg!(target_os = "windows") {
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip".to_string()
    } else if cfg!(target_os = "macos") {
        let arch_suffix = if cfg!(target_arch = "aarch64") {
            "arm"
        } else {
            "intel"
        };
        let ver_suffix = FFMPEG_VERSION.replace(".", "");
        format!(
            "https://www.osxexperts.net/ffmpeg{}{}.zip",
            ver_suffix, arch_suffix
        )
    } else {
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz".to_string()
    };

    fs::create_dir_all(&bin_dir)?;

    let buffer = crate::bundler::download_with_progress(app, &url, "Downloading ffmpeg...").await?;

    if url.ends_with(".zip") || cfg!(target_os = "macos") {
        extract_zip(app, buffer, &ffmpeg_path, binary_name)?;
    } else if url.ends_with(".tar.xz") {
        extract_tar_xz(buffer, &ffmpeg_path, binary_name)?;
    } else {
        return Err(anyhow::anyhow!("Unsupported FFmpeg archive format or OS"));
    }

    tokio::fs::write(&version_path, FFMPEG_VERSION).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&ffmpeg_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&ffmpeg_path, perms)?;
    }

    let _ = app.emit(
        "setup://progress",
        SetupProgressPayload {
            status: "ffmpeg ready".into(),
            progress: 100.0,
        },
    );

    Ok(ffmpeg_path)
}

fn extract_zip(
    app: &AppHandle,
    buffer: Vec<u8>,
    ffmpeg_path: &PathBuf,
    binary_name: &str,
) -> Result<(), anyhow::Error> {
    let reader = Cursor::new(buffer);
    let mut archive = zip::ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name().ends_with(binary_name) {
            let total_extract = file.size();
            let mut outfile = fs::File::create(ffmpeg_path)?;

            // Track extraction progress
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
                        status: "Extracting ffmpeg...".into(),
                        progress: op_percent,
                    },
                );
            }
            break;
        }
    }
    Ok(())
}

fn extract_tar_xz(
    buffer: Vec<u8>,
    ffmpeg_path: &PathBuf,
    binary_name: &str,
) -> Result<(), anyhow::Error> {
    use tar::Archive;
    use xz2::read::XzDecoder;

    let decoder = XzDecoder::new(Cursor::new(buffer));
    let mut archive = Archive::new(decoder);

    for entry in archive.entries()? {
        let mut entry = entry?;
        let path = entry.path()?;
        if path.to_string_lossy().ends_with(binary_name) {
            entry.unpack(ffmpeg_path)?;
            break;
        }
    }
    Ok(())
}

pub fn check_health(app: &AppHandle) -> bool {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return false,
    };
    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    };
    let ffmpeg_path = bin_dir.join(binary_name);
    let version_path = bin_dir.join("ffmpeg.version");

    if !ffmpeg_path.exists() || !version_path.exists() {
        return false;
    }

    if let Ok(v) = fs::read_to_string(&version_path) {
        if v.trim() != FFMPEG_VERSION {
            return false;
        }
    } else {
        return false;
    }

    true
}
