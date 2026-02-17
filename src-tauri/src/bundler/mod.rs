use serde::Serialize;
use tauri::AppHandle;

pub mod bun;
pub mod ejs;
pub mod ffmpeg;
pub mod ytdlp;

pub use bun::ensure_bun;
pub use ejs::ensure_ejs;
pub use ffmpeg::ensure_ffmpeg;
pub use ytdlp::ensure_ytdlp;

const YT_DLP_VERSION: &str = "2026.02.04";
const FFMPEG_VERSION: &str = "8.0";
const BUN_VERSION: &str = "1.3.9";
const EJS_VERSION: &str = "0.4.0";

pub fn check_bundler_health(app: &AppHandle) -> bool {
    ytdlp::check_health(app)
        && ffmpeg::check_health(app)
        && bun::check_health(app)
        && ejs::check_health(app)
}

#[derive(Clone, Serialize)]
pub struct SetupProgressPayload {
    pub status: String,
    pub progress: f64,
}

pub async fn download_with_progress(
    app: &AppHandle,
    url: &str,
    status_prefix: &str,
) -> Result<Vec<u8>, anyhow::Error> {
    use reqwest::Client;
    use tauri::Emitter;

    let client = Client::new();
    let mut res = client.get(url).send().await?;

    if !res.status().is_success() {
        return Err(anyhow::anyhow!(
            "Failed to download {}: {}",
            status_prefix,
            res.status()
        ));
    }

    let total_size = res.content_length().unwrap_or(1);
    let mut buffer = Vec::with_capacity(total_size as usize);

    while let Some(chunk) = res.chunk().await? {
        buffer.extend_from_slice(&chunk);
        let op_percent = (buffer.len() as f64 / total_size as f64) * 100.0;

        let _ = app.emit(
            "setup://progress",
            SetupProgressPayload {
                status: status_prefix.to_string(),
                progress: op_percent,
            },
        );
    }

    Ok(buffer)
}
