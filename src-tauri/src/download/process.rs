use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tokio::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use super::manager::DownloadManager;
use super::types::{DownloadProgressPayload, MetadataPayload};
use crate::bundler;

#[derive(Deserialize)]
struct YtDlpOutput {
    id: Option<String>,
    url: Option<String>,
    title: Option<String>,
    artist: Option<String>,
    creator: Option<String>,
    uploader: Option<String>,
    album: Option<String>,
    thumbnail: Option<String>,
    duration: Option<f64>,
}

pub async fn get_metadata(app: AppHandle, url: String) -> Result<Vec<MetadataPayload>, String> {
    let ytdlp_path = bundler::ensure_ytdlp(&app)
        .await
        .map_err(|e| e.to_string())?;

    let mut cmd = Command::new(ytdlp_path);
    cmd.args(["--dump-json", "--flat-playlist", &url]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("yt-dlp failed: {}", stderr));
    }

    let stream = serde_json::Deserializer::from_slice(&output.stdout).into_iter::<YtDlpOutput>();
    let mut results = Vec::new();

    for entry in stream {
        let yt_data = entry.map_err(|e| format!("Failed to parse yt-dlp output: {}", e))?;

        let title = yt_data.title.unwrap_or_else(|| "Unknown Title".into());
        let artist = yt_data
            .artist
            .or(yt_data.creator)
            .or(yt_data.uploader)
            .unwrap_or_else(|| "Unknown Artist".into());

        let video_url = yt_data.url.unwrap_or_else(|| url.clone());

        results.push(MetadataPayload {
            id: yt_data.id.unwrap_or_else(|| "unknown".into()),
            url: video_url,
            title,
            artist,
            album: yt_data.album,
            thumbnail: yt_data.thumbnail,
            duration: yt_data.duration,
        });
    }

    if results.is_empty() {
        return Err("No metadata found".into());
    }

    Ok(results)
}

fn parse_log_status(line: &str) -> Option<String> {
    if line.contains("Downloading webpage") {
        return Some("Fetching Info".to_string());
    }

    if line.contains("Downloading android vr player API JSON")
        || line.contains("Downloading web safari player API JSON")
        || line.contains("Downloading player")
        || line.contains("Solving JS challenges")
        || line.contains("Downloading m3u8 information")
    {
        return Some("Preparing Download".to_string());
    }

    if line.contains("Destination:") || line.contains("download-progress:") {
        return Some("Downloading".to_string());
    }

    if line.contains("[ExtractAudio]") || line.contains("Extracting audio") {
        return Some("Extracting Audio".to_string());
    }

    if line.contains("[Metadata]") || line.contains("Adding metadata") {
        return Some("Adding Metadata".to_string());
    }

    if line.contains("[ThumbnailsConvertor]") || line.contains("Converting thumbnail") {
        return Some("Converting Thumbnail".to_string());
    }

    if line.contains("[EmbedThumbnail]") || line.contains("Adding thumbnail") {
        return Some("Embedding Thumbnail".to_string());
    }

    None
}

fn get_ytdlp_paths(app: &AppHandle) -> Result<(PathBuf, PathBuf), anyhow::Error> {
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
    Ok((bin_dir, ytdlp_path))
}

fn prepare_output_template(library_path: &str) -> Result<String, anyhow::Error> {
    let songs_dir = std::path::Path::new(library_path).join("Songs");
    if !songs_dir.exists() {
        fs::create_dir_all(&songs_dir)?;
    }

    Ok(format!(
        "{}/%(title).150s-%(id).50s.%(ext)s",
        songs_dir.to_string_lossy()
    ))
}

fn construct_download_cmd(
    ytdlp_path: &Path,
    bin_dir: &Path,
    output_template: &str,
    url: &str,
) -> Command {
    let mut cmd = Command::new(ytdlp_path);
    let current_path = std::env::var_os("PATH").unwrap_or_default();
    let mut new_path = bin_dir.to_string_lossy().to_string();

    #[cfg(windows)]
    new_path.push(';');

    #[cfg(not(windows))]
    new_path.push(':');

    new_path.push_str(&current_path.to_string_lossy());

    cmd.env("PATH", new_path);
    cmd.args([
        "--restrict-filenames",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "320k",
        "--ffmpeg-location",
        &bin_dir.to_string_lossy(),
        "--js-runtimes",
        "bun",
        "--embed-thumbnail",
        "--embed-metadata",
        "--compat-options",
        "no-youtube-unavailable-videos",
        "-o",
        output_template,
        "--newline",
        "--progress-template",
        "download-progress:%(progress._percent_str)s",
        url,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd
}

async fn get_final_filename(
    ytdlp_path: &Path,
    output_template: &str,
    url: &str,
) -> Result<String, anyhow::Error> {
    let mut cmd = Command::new(ytdlp_path);
    cmd.args([
        "--restrict-filenames",
        "-o",
        output_template,
        "--get-filename",
        url,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd.output().await?;

    let filename = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if filename.is_empty() {
        return Err(anyhow::anyhow!("Failed to resolve downloaded filename"));
    }

    Ok(filename)
}

async fn add_song_to_db(
    app: &AppHandle,
    id: String,
    metadata: MetadataPayload,
    filename: String,
) -> Result<(), anyhow::Error> {
    let path = PathBuf::from(filename);
    let final_path = path.with_extension("mp3");

    let db_state = app
        .try_state::<Mutex<Option<crate::db::Database>>>()
        .ok_or_else(|| anyhow::anyhow!("Database state not found"))?;

    let db = {
        let db_guard = db_state.lock().unwrap();
        db_guard
            .clone()
            .ok_or_else(|| anyhow::anyhow!("Database not initialized"))?
    };

    let song = crate::db::entities::Song {
        id: id.clone(),
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        filename: final_path
            .file_name()
            .unwrap()
            .to_string_lossy()
            .to_string(),
    };

    db.add_song(&song)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to add song to database: {}", e))?;

    let _ = app.emit("library://updated", ());
    Ok(())
}

fn process_stdout_line(app: &AppHandle, manager: &DownloadManager, id: &str, line: &str) {
    let detailed_status = parse_log_status(line);
    let log_payload = DownloadProgressPayload {
        id: id.to_string(),
        progress: -1.0,
        status: "downloading".into(),
        detailed_status: detailed_status.clone(),
        log: Some(line.to_string()),
    };
    let _ = app.emit("download://progress", log_payload);

    manager.append_log(id, line.to_string());
    manager.update_detailed_status(id, detailed_status);

    if let Some(rest) = line.strip_prefix("download-progress:") {
        if let Some(percentage_str) = rest.strip_suffix('%') {
            if let Ok(percentage) = percentage_str.trim().parse::<f64>() {
                let progress_payload = DownloadProgressPayload {
                    id: id.to_string(),
                    progress: percentage,
                    status: "downloading".into(),
                    detailed_status: Some("Downloading".to_string()),
                    log: None,
                };
                let _ = app.emit("download://progress", progress_payload);

                manager.update_job_status(app, id, "downloading", percentage);
            }
        }
    }
}

fn process_stderr_line(app: &AppHandle, manager: &DownloadManager, id: &str, line: &str) {
    let detailed_status = parse_log_status(line);
    let log_payload = DownloadProgressPayload {
        id: id.to_string(),
        progress: -1.0,
        status: "downloading".into(),
        detailed_status: detailed_status.clone(),
        log: Some(format!("[stderr] {}", line)),
    };

    let _ = app.emit("download://progress", log_payload);

    manager.append_log(id, format!("[stderr] {}", line));
    manager.update_detailed_status(id, detailed_status);
}

pub async fn run_download(
    url: String,
    id: String,
    app: AppHandle,
    library_path: String,
    metadata: MetadataPayload,
) -> Result<(), anyhow::Error> {
    let (bin_dir, ytdlp_path) = get_ytdlp_paths(&app)?;

    let output_template = prepare_output_template(&library_path)?;

    let mut cmd = construct_download_cmd(&ytdlp_path, &bin_dir, &output_template, &url);

    let manager = app.state::<DownloadManager>();
    let (mut child, mut stdout_reader, mut stderr_reader, mut cancel_rx) =
        manager.create_process(&id, &mut cmd)?;

    use tokio::io::AsyncBufReadExt;

    let status = loop {
        let mut stdout_buf = Vec::new();
        let mut stderr_buf = Vec::new();

        tokio::select! {
            res = stdout_reader.read_until(b'\n', &mut stdout_buf) => {
                match res {
                    Ok(0) => break child.wait().await?,
                    Ok(_) => {
                         let line = String::from_utf8_lossy(&stdout_buf);
                         process_stdout_line(&app, &manager, &id, line.trim());
                    }
                    Err(e) => return Err(e.into()),
                }
            }
            res = stderr_reader.read_until(b'\n', &mut stderr_buf) => {
                match res {
                    Ok(0) => break child.wait().await?,
                    Ok(_) => {
                        let line = String::from_utf8_lossy(&stderr_buf);
                        process_stderr_line(&app, &manager, &id, line.trim());
                    }
                    Err(e) => return Err(e.into()),
                }
            }
            _ = &mut cancel_rx => {
                child.kill().await?;
                return Err(anyhow::anyhow!("Download cancelled"));
            }
        }
    };

    {
        // Unregister from centralized manager
        let manager = app.state::<DownloadManager>();
        manager.finish_process(&id);
    }

    if !status.success() {
        return Err(anyhow::anyhow!(
            "Download failed with exit code: {:?}",
            status.code()
        ));
    }

    let filename = get_final_filename(&ytdlp_path, &output_template, &url).await?;

    add_song_to_db(&app, id, metadata, filename).await?;

    Ok(())
}
