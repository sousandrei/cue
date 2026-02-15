use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
pub struct DownloadProgressPayload {
    pub id: String,
    pub progress: f64,
    pub status: String,
    pub detailed_status: Option<String>,
    pub log: Option<String>,
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
    pub detailed_status: Option<String>,
    pub url: String,
    pub metadata: MetadataPayload,
    pub logs: Vec<String>,
}
