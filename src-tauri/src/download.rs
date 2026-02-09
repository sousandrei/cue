use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;
use std::io::Cursor;

use crate::config::Config;

pub struct ActiveProcesses(pub Mutex<HashMap<String, oneshot::Sender<()>>>);

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
    is_cancelled: bool,
}

#[derive(Clone, Serialize)]
struct SetupProgressPayload {
    status: String,
    progress: f64,
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
                // Set to pending
                {
                    let mut jobs_guard = manager.jobs.lock().unwrap();
                    if let Some(job) = jobs_guard.iter_mut().find(|j| j.id == id) {
                        job.status = "pending".into();
                    }
                }
                manager.emit_update();

                // Start download
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

                // Process next
                manager.trigger_processing();
            }
        });
    }
}

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
    cfg: State<'_, Mutex<Option<Config>>>,
    url: String,
) -> Result<Vec<MetadataPayload>, String> {
    let target_version = {
        let config_guard = cfg.lock().unwrap();
        let config = config_guard.as_ref().ok_or("Config not initialized")?;
        config.yt_dlp_version.clone()
    };

    let ytdlp_path = ensure_ytdlp(&app, &target_version)
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

        // Use individual video URL if available, otherwise fallback to the provided URL
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

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "Downloading yt-dlp...".into(),
        progress: 10.0,
    });

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

    let total_size = res.content_length().unwrap_or(1);
    let mut downloaded = 0;

    while let Some(chunk) = res.chunk().await? {
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;
        let progress = 10.0 + (downloaded as f64 / total_size as f64) * 40.0;
        let _ = app.emit("setup://progress", SetupProgressPayload {
            status: format!("Downloading yt-dlp... ({:.1}%)", (downloaded as f64 / total_size as f64) * 100.0),
            progress,
        });
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

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "yt-dlp ready".into(),
        progress: 50.0,
    });

    Ok(ytdlp_path)
}

pub async fn ensure_ffmpeg<R: Runtime>(
    app: &AppHandle<R>,
    target_version: &str,
) -> Result<PathBuf, anyhow::Error> {
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
            if v.trim() == target_version {
                return Ok(ffmpeg_path);
            }
        }
    }

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "Downloading ffmpeg...".into(),
        progress: 50.0,
    });

    // Static builds from BtbN/FFmpeg-Builds or similar
    let url = if cfg!(target_os = "windows") {
        "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    } else if cfg!(target_os = "macos") {
        "https://evermeet.cx/ffmpeg/getrelease/zip"
    } else {
         "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
    };

    // Note: Linux tar.xz handling is more complex, let's stick to zip for now if possible or use a library
    // For simplicity of this task, I'll focus on Mac/Windows first or use a universal source if available.
    // Actually, Evermeet for Mac is good. For Windows, BtbN is good.
    
    let client = Client::new();
    let mut res = client.get(url).send().await?;

    if !res.status().is_success() {
        return Err(anyhow::anyhow!("Failed to download ffmpeg: {}", res.status()));
    }

    let total_size = res.content_length().unwrap_or(1);
    let mut buffer = Vec::new();

    while let Some(chunk) = res.chunk().await? {
        buffer.extend_from_slice(&chunk);
        let progress = 50.0 + (buffer.len() as f64 / total_size as f64) * 40.0;
        let _ = app.emit("setup://progress", SetupProgressPayload {
            status: format!("Downloading ffmpeg... ({:.1}%)", (buffer.len() as f64 / total_size as f64) * 100.0),
            progress,
        });
    }

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "Extracting ffmpeg...".into(),
        progress: 95.0,
    });

    // Extracting
    if url.ends_with(".zip") || cfg!(target_os = "macos") { // Evermeet returns a zip
        let reader = Cursor::new(buffer);
        let mut archive = zip::ZipArchive::new(reader)?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = file.mktemp_path().unwrap_or_else(|| PathBuf::from(file.name()));
            
            if file.name().ends_with(binary_name) {
                let mut outfile = fs::File::create(&ffmpeg_path)?;
                std::io::copy(&mut file, &mut outfile)?;
                break;
            }
        }
    } else {
        // Handle linux tar.xz if needed, but for now let's assume we can at least get Mac/Windows working
        return Err(anyhow::anyhow!("Linux ffmpeg extraction not implemented yet in this script"));
    }

    // Write version file
    tokio::fs::write(&version_path, target_version).await?;

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&ffmpeg_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&ffmpeg_path, perms)?;
    }

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "ffmpeg ready".into(),
        progress: 100.0,
    });

    Ok(ffmpeg_path)
}

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

    // Check version
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

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "Downloading Bun...".into(),
        progress: 90.0,
    });

    let arch = if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x64"
    };

    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        let mac_arch = if cfg!(target_arch = "aarch64") { "arm64" } else { "x64" };
        return download_bun_zip(app, &format!("https://github.com/oven-sh/bun/releases/download/bun-v{}/bun-darwin-{}.zip", target_version, mac_arch), &bun_path, &version_path, target_version).await;
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
    let client = Client::new();
    let res = client.get(url).send().await?;

    if !res.status().is_success() {
        return Err(anyhow::anyhow!("Failed to download Bun: {}", res.status()));
    }

    let bytes = res.bytes().await?;
    let reader = Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name().ends_with("bun") || file.name().ends_with("bun.exe") {
            let mut outfile = fs::File::create(bun_path)?;
            std::io::copy(&mut file, &mut outfile)?;
            break;
        }
    }

    // Write version file
    tokio::fs::write(version_path, target_version).await?;

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(bun_path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(bun_path, perms)?;
    }

    let _ = app.emit("setup://progress", SetupProgressPayload {
        status: "Bun ready".into(),
        progress: 100.0,
    });

    Ok(bun_path.clone())
}

async fn run_download<R: Runtime>(
    url: String,
    id: String,
    app: AppHandle<R>,
    library_path: String,
    metadata: MetadataPayload,
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

    let songs_dir = std::path::Path::new(&library_path).join("Songs");
    if !songs_dir.exists() {
        fs::create_dir_all(&songs_dir)?;
    }
    let output_template = format!("{}/%(title)s-%(id)s.%(ext)s", songs_dir.to_string_lossy());

    let mut cmd = Command::new(&ytdlp_path);
    
    // Add bin directory to PATH so yt-dlp can find bun/ffmpeg if needed via PATH as well
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

    // Register active process
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
                                    app.emit(
                                        "download://progress",
                                        progress_payload.clone(),
                                    )?;

                                    // Update manager state
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
                    Ok(None) => {
                        // Stdout closed, wait for child
                        break child.wait().await?;
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

    // Unregister
    {
        let processes_state = app.state::<ActiveProcesses>();
        let mut processes = processes_state.0.lock().unwrap();
        processes.remove(&id);
    }

    if !status.success() {
        let mut stderr = child.stderr.take().unwrap();
        let mut stderr_content = String::new();
        tokio::io::read_to_string(&mut stderr).await?;
        
        return Err(anyhow::anyhow!(
            "Download failed with exit code: {:?}. Stderr: {}",
            status.code(),
            stderr_content
        ));
    }

    // Resolve final filename
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

    // Force .mp3 extension
    let path = PathBuf::from(filename);
    let final_path = path.with_extension("mp3");

    // Add to database
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
