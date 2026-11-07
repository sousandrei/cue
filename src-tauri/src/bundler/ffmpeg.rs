use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use super::{SetupProgressPayload, FFMPEG_VERSION};

pub async fn ensure_ffmpeg(app: &AppHandle) -> Result<PathBuf, anyhow::Error> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;

    let bin_dir = app_data_dir.join("bin");
    let (ffmpeg_name, ffprobe_name) = if cfg!(target_os = "windows") {
        ("ffmpeg.exe", "ffprobe.exe")
    } else {
        ("ffmpeg", "ffprobe")
    };

    let ffmpeg_path = bin_dir.join(ffmpeg_name);
    let ffprobe_path = bin_dir.join(ffprobe_name);
    let version_path = bin_dir.join("ffmpeg.version");

    // Check version
    let current_version = if version_path.exists() {
        fs::read_to_string(&version_path).ok()
    } else {
        None
    };

    if ffmpeg_path.exists() && ffprobe_path.exists() {
        if let Some(v) = current_version {
            if v.trim() == FFMPEG_VERSION {
                return Ok(ffmpeg_path);
            }
        }
    }

    let _ = app.emit(
        "setup://progress",
        SetupProgressPayload {
            status: "Downloading ffmpeg/ffprobe...".into(),
            progress: 0.0,
        },
    );

    let urls = download_urls(std::env::consts::OS, std::env::consts::ARCH)?;

    fs::create_dir_all(&bin_dir)?;

    for url in urls {
        let buffer =
            crate::bundler::download_with_progress(app, &url, "Downloading ffmpeg/ffprobe...")
                .await?;

        if url.ends_with(".zip") || cfg!(target_os = "macos") {
            extract_zip(app, buffer, &bin_dir, ffmpeg_name, ffprobe_name)?;
        } else if url.ends_with(".tar.xz") {
            extract_tar_xz(buffer, &bin_dir, ffmpeg_name, ffprobe_name)?;
        } else {
            return Err(anyhow::anyhow!("Unsupported FFmpeg archive format or OS"));
        }
    }

    tokio::fs::write(&version_path, FFMPEG_VERSION).await?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&ffmpeg_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&ffmpeg_path, perms);
        }
        if let Ok(metadata) = fs::metadata(&ffprobe_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&ffprobe_path, perms);
        }
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

fn download_urls(os: &str, arch: &str) -> anyhow::Result<Vec<String>> {
    if !matches!(arch, "x86_64" | "aarch64") {
        anyhow::bail!("Unsupported FFmpeg architecture: {arch}");
    }

    match os {
        "macos" => Ok(["ffmpeg", "ffprobe"]
            .into_iter()
            .map(|binary| {
                if arch == "aarch64" {
                    let version = FFMPEG_VERSION.replace('.', "");
                    format!("https://www.osxexperts.net/{binary}{version}arm.zip")
                } else {
                    // OSXExperts' Intel builds are still on FFmpeg 8.
                    format!("https://evermeet.cx/ffmpeg/{binary}-{FFMPEG_VERSION}.zip")
                }
            })
            .collect()),
        "windows" | "linux" => {
            let (series, _) = FFMPEG_VERSION
                .rsplit_once('.')
                .ok_or_else(|| anyhow::anyhow!("Invalid FFmpeg version: {FFMPEG_VERSION}"))?;
            let platform = if os == "windows" { "win" } else { "linux" };
            let architecture = if arch == "aarch64" { "arm64" } else { "64" };
            let extension = if os == "windows" { "zip" } else { "tar.xz" };
            // Use the stable release series rather than rolling master builds.
            Ok(vec![format!(
                "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n{series}-latest-{platform}{architecture}-gpl-{series}.{extension}"
            )])
        }
        _ => anyhow::bail!("Unsupported FFmpeg operating system: {os}"),
    }
}

fn extract_zip(
    app: &AppHandle,
    buffer: Vec<u8>,
    bin_dir: &Path,
    ffmpeg_name: &str,
    ffprobe_name: &str,
) -> Result<(), anyhow::Error> {
    let reader = Cursor::new(buffer);
    let mut archive = zip::ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let file_name = match Path::new(file.name()?.as_ref()).file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        if file_name == ffmpeg_name || file_name == ffprobe_name {
            let total_extract = file.size();
            let target_path = bin_dir.join(&file_name);
            let mut outfile = fs::File::create(&target_path)?;

            // Track extraction progress
            let mut extracted = 0;
            let mut chunk_buf = [0u8; 8192];
            while let Ok(n) = std::io::Read::read(&mut file, &mut chunk_buf) {
                if n == 0 {
                    break;
                }
                std::io::Write::write_all(&mut outfile, &chunk_buf[..n])?;
                extracted += n as u64;

                let op_percent = if total_extract > 0 {
                    (extracted as f64 / total_extract as f64) * 100.0
                } else {
                    100.0
                };

                let _ = app.emit(
                    "setup://progress",
                    SetupProgressPayload {
                        status: format!("Extracting {}...", file_name),
                        progress: op_percent,
                    },
                );
            }
        }
    }
    Ok(())
}

fn extract_tar_xz(
    buffer: Vec<u8>,
    bin_dir: &Path,
    ffmpeg_name: &str,
    ffprobe_name: &str,
) -> Result<(), anyhow::Error> {
    use tar::Archive;
    use xz2::read::XzDecoder;

    let decoder = XzDecoder::new(Cursor::new(buffer));
    let mut archive = Archive::new(decoder);

    for entry in archive.entries()? {
        let mut entry = entry?;
        let path = entry.path()?;
        let file_name = match path.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        if file_name == ffmpeg_name || file_name == ffprobe_name {
            let target_path = bin_dir.join(&file_name);
            entry.unpack(&target_path)?;
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
    let (ffmpeg_name, ffprobe_name) = if cfg!(target_os = "windows") {
        ("ffmpeg.exe", "ffprobe.exe")
    } else {
        ("ffmpeg", "ffprobe")
    };
    let ffmpeg_path = bin_dir.join(ffmpeg_name);
    let ffprobe_path = bin_dir.join(ffprobe_name);
    let version_path = bin_dir.join("ffmpeg.version");

    if !ffmpeg_path.exists() || !ffprobe_path.exists() || !version_path.exists() {
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

#[cfg(test)]
mod tests {
    use super::download_urls;

    #[test]
    fn macos_downloads_match_each_architecture() {
        assert_eq!(
            download_urls("macos", "aarch64").unwrap(),
            [
                "https://www.osxexperts.net/ffmpeg902arm.zip",
                "https://www.osxexperts.net/ffprobe902arm.zip",
            ]
        );
        assert_eq!(
            download_urls("macos", "x86_64").unwrap(),
            [
                "https://evermeet.cx/ffmpeg/ffmpeg-9.0.2.zip",
                "https://evermeet.cx/ffmpeg/ffprobe-9.0.2.zip",
            ]
        );
    }

    #[test]
    fn windows_and_linux_use_stable_archives() {
        for (os, arch, filename) in [
            ("windows", "x86_64", "ffmpeg-n9.0-latest-win64-gpl-9.0.zip"),
            (
                "windows",
                "aarch64",
                "ffmpeg-n9.0-latest-winarm64-gpl-9.0.zip",
            ),
            (
                "linux",
                "x86_64",
                "ffmpeg-n9.0-latest-linux64-gpl-9.0.tar.xz",
            ),
            (
                "linux",
                "aarch64",
                "ffmpeg-n9.0-latest-linuxarm64-gpl-9.0.tar.xz",
            ),
        ] {
            assert_eq!(
                download_urls(os, arch).unwrap(),
                [format!(
                    "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/{filename}"
                )]
            );
        }
    }

    #[test]
    fn unsupported_platforms_do_not_download_incompatible_binaries() {
        assert!(download_urls("macos", "x86").is_err());
        assert!(download_urls("freebsd", "x86_64").is_err());
    }
}
