use reqwest::Client;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize)]
struct DownloadProgressPayload {
    id: String,
    progress: f64,
    status: String,
}

#[derive(Clone, Serialize)]
struct DownloadErrorPayload {
    id: String,
    error: String,
}

#[tauri::command]
pub async fn download_audio<R: Runtime>(
    app: AppHandle<R>,
    config_state: State<'_, Mutex<crate::config::Config>>,
    url: String,
    id: String,
) -> Result<(), String> {
    let app_handle = app.clone();
    let download_id = id.clone();

    // Clone config values needed for async task
    let (library_path, _version) = {
        let config = config_state.lock().unwrap();
        (config.library_path.clone(), config.yt_dlp_version.clone())
    };

    tauri::async_runtime::spawn(async move {
        match run_download(url, download_id.clone(), &app_handle, library_path).await {
            Ok(_) => {
                let _ = app_handle.emit(
                    "download://progress",
                    DownloadProgressPayload {
                        id: download_id,
                        progress: 100.0,
                        status: "completed".into(),
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit(
                    "download://progress",
                    DownloadProgressPayload {
                        id: download_id.clone(),
                        progress: 0.0,
                        status: "error".into(),
                    },
                );

                let _ = app_handle.emit(
                    "download://error",
                    DownloadErrorPayload {
                        id: download_id,
                        error: e.to_string(),
                    },
                );
            }
        }
    });

    Ok(())
}

pub async fn ensure_ytdlp<R: Runtime>(
    app: &AppHandle<R>,
    target_version: &str,
) -> Result<PathBuf, anyhow::Error> {
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
            if v.trim() == target_version {
                return Ok(ytdlp_path);
            }
        }
    }

    // Download yt-dlp
    let url = if cfg!(target_os = "windows") {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp.exe",
            target_version
        )
    } else if cfg!(target_os = "macos") {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp_macos",
            target_version
        )
    } else {
        format!(
            "https://github.com/yt-dlp/yt-dlp/releases/download/{}/yt-dlp_linux",
            target_version
        )
    };

    let client = Client::new();
    let mut res = client.get(&url).send().await?;

    if !res.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to download yt-dlp: {}",
            res.status()
        ));
    }

    let temp_path = ytdlp_path.with_extension("tmp");
    let mut file = tokio::fs::File::create(&temp_path).await?;

    while let Some(chunk) = res.chunk().await? {
        file.write_all(&chunk).await?;
    }

    file.flush().await?;

    // Rename to final path
    tokio::fs::rename(&temp_path, &ytdlp_path).await?;

    // Write version file
    tokio::fs::write(&version_path, target_version).await?;

    // Make executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&ytdlp_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&ytdlp_path, perms)?;
    }

    Ok(ytdlp_path)
}

async fn run_download<R: Runtime>(
    url: String,
    id: String,
    app: &AppHandle<R>,
    library_path: String,
) -> Result<(), anyhow::Error> {
    // Resolve path directly assuming it exists
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| anyhow::anyhow!("Failed to get app data dir: {}", e))?;
    let bin_dir = app_data_dir.join("bin");
    let binary_name = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };
    let ytdlp_path = bin_dir.join(binary_name);

    if !ytdlp_path.exists() {
        return Err(anyhow::anyhow!(
            "yt-dlp not found. Please ensure initialization completed successfully."
        ));
    }

    let output_template = format!("{}/%(title)s-%(id)s.%(ext)s", library_path);

    let mut cmd = Command::new(ytdlp_path);
    cmd.args(&[
        "--restrict-filenames",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "320k",
        "--embed-thumbnail",
        "--embed-metadata",
        "--compat-options",
        "no-youtube-unavailable-videos",
        "-o",
        &output_template,
        "--newline",
        "--progress-template",
        "download-progress:%(progress._percent_str)s",
        &url,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let mut child = cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;

    let mut reader = BufReader::new(stdout).lines();

    while let Some(line) = reader.next_line().await? {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("download-progress:") {
            if let Some(percentage_str) = rest.strip_suffix('%') {
                if let Ok(percentage) = percentage_str.trim().parse::<f64>() {
                    app.emit(
                        "download://progress",
                        DownloadProgressPayload {
                            id: id.clone(),
                            progress: percentage,
                            status: "downloading".into(),
                        },
                    )?;
                }
            }
        }
    }

    let status = child.wait().await?;

    if status.success() {
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "Download failed with exit code: {:?}",
            status.code()
        ))
    }
}
