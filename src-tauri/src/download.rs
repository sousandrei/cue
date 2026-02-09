use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;

use crate::bundler;
use crate::config::Config;

// --- Types ---

#[derive(Clone, Serialize)]
pub struct DownloadProgressPayload {
    pub id: String,
    pub progress: f64,
    pub status: String,
}

#[derive(Clone, Serialize)]
pub struct DownloadErrorPayload {
    pub id: String,
    pub error: String,
    pub is_cancelled: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct MetadataPayload {
    pub id: String,
    pub url: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadJob {
    pub id: String,
    pub title: String,
    pub progress: f64,
    pub status: String, // "queued" | "pending" | "downloading" | "completed" | "error"
    pub url: String,
    pub metadata: MetadataPayload,
}

// --- Manager ---

pub struct ActiveProcesses(pub Mutex<HashMap<String, oneshot::Sender<()>>>);

pub struct DownloadManager {
    pub jobs: Mutex<Vec<DownloadJob>>,
    pub app: AppHandle,
}

impl DownloadManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            jobs: Mutex::new(Vec::new()),
            app,
        }
    }

    pub fn add_job(&self, job: DownloadJob) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.push(job);
        }
        self.emit_update();
        self.trigger_processing();
    }

    pub fn get_jobs(&self) -> Vec<DownloadJob> {
        let jobs = self.jobs.lock().unwrap();
        jobs.clone()
    }

    pub fn remove_job(&self, id: &str) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.id != id);
        }
        self.emit_update();
    }

    pub fn clear_history(&self) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.status != "completed" && j.status != "error");
        }
        self.emit_update();
    }

    pub fn clear_queue(&self) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.status != "queued");
        }
        self.emit_update();
    }

    fn emit_update(&self) {
        let jobs = self.jobs.lock().unwrap();
        let _ = self.app.emit("download://list-updated", jobs.clone());
    }

    pub fn update_job_status(&self, id: &str, status: &str, progress: f64) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
                job.status = status.to_string();
                job.progress = progress;
            }
        }
        self.emit_update();
    }

    pub fn trigger_processing(&self) {
        let app = self.app.clone();
        tauri::async_runtime::spawn(async move {
            let manager = app.state::<DownloadManager>();

            let next_job_info = {
                let jobs_guard = manager.jobs.lock().unwrap();
                let is_processing = jobs_guard
                    .iter()
                    .any(|j| j.status == "pending" || j.status == "downloading");

                if is_processing {
                    return;
                }

                jobs_guard
                    .iter()
                    .find(|j| j.status == "queued")
                    .map(|j| (j.id.clone(), j.url.clone(), j.metadata.clone()))
            };

            if let Some((id, url, metadata)) = next_job_info {
                {
                    let mut jobs_guard = manager.jobs.lock().unwrap();
                    if let Some(job) = jobs_guard.iter_mut().find(|j| j.id == id) {
                        job.status = "pending".into();
                    }
                }
                manager.emit_update();

                let config_state = app.state::<Mutex<Option<Config>>>();
                let library_path = {
                    let config_guard = config_state.lock().unwrap();
                    config_guard.as_ref().unwrap().library_path.clone()
                };

                let result =
                    run_download(url, id.clone(), app.clone(), library_path, metadata).await;

                if let Err(e) = result {
                    let error_msg = e.to_string();
                    let is_cancelled = error_msg == "Download cancelled";

                    manager.update_job_status(&id, "error", 0.0);

                    let _ = app.emit(
                        "download://error",
                        DownloadErrorPayload {
                            id: id.clone(),
                            error: error_msg,
                            is_cancelled,
                        },
                    );
                } else {
                    manager.update_job_status(&id, "completed", 100.0);
                }

                manager.trigger_processing();
            }
        });
    }
}

// --- Process ---

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

pub async fn get_metadata<R: Runtime>(
    app: AppHandle<R>,
    cfg: State<'_, crate::config::ConfigState>,
    url: String,
) -> Result<Vec<MetadataPayload>, String> {
    let target_version = {
        let config_guard = cfg.lock().unwrap();
        let config = config_guard.as_ref().ok_or("Config not initialized")?;
        config.yt_dlp_version.clone()
    };

    let ytdlp_path = bundler::ensure_ytdlp(&app, &target_version)
        .await
        .map_err(|e| e.to_string())?;

    let output = Command::new(ytdlp_path)
        .args(["--dump-json", "--flat-playlist", &url])
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

pub async fn run_download<R: Runtime>(
    url: String,
    id: String,
    app: AppHandle<R>,
    library_path: String,
    metadata: MetadataPayload,
) -> Result<(), anyhow::Error> {
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

    let songs_dir = std::path::Path::new(&library_path).join("Songs");
    if !songs_dir.exists() {
        fs::create_dir_all(&songs_dir)?;
    }
    let output_template = format!("{}/%(title)s-%(id)s.%(ext)s", songs_dir.to_string_lossy());

    let mut cmd = Command::new(&ytdlp_path);

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
        &output_template,
        "--newline",
        "--progress-template",
        "download-progress:%(progress._percent_str)s",
        &url,
    ]);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let mut child = cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()?;

    let (cancel_tx, mut cancel_rx) = oneshot::channel();

    {
        let processes_state = app.state::<ActiveProcesses>();
        let mut processes = processes_state.0.lock().unwrap();
        processes.insert(id.clone(), cancel_tx);
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
    let mut reader = BufReader::new(stdout).lines();

    let status = loop {
        tokio::select! {
            line_res = reader.next_line() => {
                match line_res {
                    Ok(Some(line)) => {
                        let line = line.trim();
                        if let Some(rest) = line.strip_prefix("download-progress:") {
                            if let Some(percentage_str) = rest.strip_suffix('%') {
                                if let Ok(percentage) = percentage_str.trim().parse::<f64>() {
                                    let progress_payload = DownloadProgressPayload {
                                        id: id.clone(),
                                        progress: percentage,
                                        status: "downloading".into(),
                                    };
                                    app.emit("download://progress", progress_payload.clone())?;

                                    let manager = app.state::<DownloadManager>();
                                    {
                                        let mut jobs = manager.jobs.lock().unwrap();
                                        if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
                                            job.progress = percentage;
                                            job.status = "downloading".into();
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(None) => break child.wait().await?,
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
        let processes_state = app.state::<ActiveProcesses>();
        let mut processes = processes_state.0.lock().unwrap();
        processes.remove(&id);
    }

    if !status.success() {
        let mut stderr = child.stderr.take().unwrap();
        let mut stderr_content = String::new();
        stderr.read_to_string(&mut stderr_content).await?;

        return Err(anyhow::anyhow!(
            "Download failed with exit code: {:?}. Stderr: {}",
            status.code(),
            stderr_content
        ));
    }

    let output = Command::new(&ytdlp_path)
        .args([
            "--restrict-filenames",
            "-o",
            &output_template,
            "--get-filename",
            &url,
        ])
        .output()
        .await?;

    let filename = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if filename.is_empty() {
        return Err(anyhow::anyhow!("Failed to resolve downloaded filename"));
    }

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

    Ok(())
}
