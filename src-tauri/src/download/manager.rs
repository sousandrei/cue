use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::BufReader;
use tokio::process::{Child, ChildStderr, ChildStdout, Command};
use tokio::sync::oneshot;

use super::types::{DownloadErrorPayload, DownloadJob};
use crate::download::process::run_download;

struct JobState {
    job: DownloadJob,
    cancel_tx: Option<oneshot::Sender<()>>,
}

pub struct DownloadManager {
    jobs: Mutex<Vec<JobState>>,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            jobs: Mutex::new(Vec::new()),
        }
    }

    pub fn create_process(
        &self,
        id: &str,
        cmd: &mut Command,
    ) -> Result<
        (
            Child,
            BufReader<ChildStdout>,
            BufReader<ChildStderr>,
            oneshot::Receiver<()>,
        ),
        anyhow::Error,
    > {
        let mut child = cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).spawn()?;

        let (tx, rx) = oneshot::channel();

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stdout"))?;
        let stdout_reader = BufReader::new(stdout);

        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| anyhow::anyhow!("Failed to capture stderr"))?;
        let stderr_reader = BufReader::new(stderr);

        {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
                job_state.cancel_tx = Some(tx);
            }
        }

        Ok((child, stdout_reader, stderr_reader, rx))
    }

    pub fn finish_process(&self, id: &str) {
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
            job_state.cancel_tx = None;
        }
    }

    pub fn cancel_job(&self, id: &str) {
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
            if let Some(tx) = job_state.cancel_tx.take() {
                let _ = tx.send(());
            }
        }
    }

    pub fn add_job(&self, app: &AppHandle, job: DownloadJob) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.push(JobState {
                job,
                cancel_tx: None,
            });
        }
        self.emit_update(app);
        self.trigger_processing(app);
    }

    pub fn get_jobs(&self) -> Vec<DownloadJob> {
        let jobs = self.jobs.lock().unwrap();
        jobs.iter().map(|j| j.job.clone()).collect()
    }

    pub fn remove_job(&self, app: &AppHandle, id: &str) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.job.id != id);
        }
        self.emit_update(app);
    }

    pub fn clear_history(&self, app: &AppHandle) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.job.status != "completed" && j.job.status != "error");
        }
        self.emit_update(app);
    }

    pub fn clear_queue(&self, app: &AppHandle) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.retain(|j| j.job.status != "queued");
        }
        self.emit_update(app);
    }

    fn emit_update(&self, app: &AppHandle) {
        let jobs = self.jobs.lock().unwrap();
        let download_jobs: Vec<DownloadJob> = jobs.iter().map(|j| j.job.clone()).collect();
        let _ = app.emit("download://list-updated", download_jobs);
    }

    pub fn update_job_status(&self, app: &AppHandle, id: &str, status: &str, progress: f64) {
        {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
                job_state.job.status = status.to_string();
                job_state.job.progress = progress;
            }
        }
        self.emit_update(app);
    }

    pub fn append_log(&self, id: &str, log: String) {
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
            job_state.job.logs.push(log);
        }
    }

    pub fn update_detailed_status(&self, id: &str, detailed_status: Option<String>) {
        if let Some(ds) = detailed_status {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some(job_state) = jobs.iter_mut().find(|j| j.job.id == id) {
                job_state.job.detailed_status = Some(ds);
            }
        }
    }

    pub fn trigger_processing(&self, app: &AppHandle) {
        let app = app.clone();
        tauri::async_runtime::spawn(async move { process_download_queue(app).await });
    }
}

async fn process_download_queue(app: AppHandle) {
    let manager = app.state::<DownloadManager>();

    let next_job_info = {
        let jobs_guard = manager.jobs.lock().unwrap();
        let is_processing = jobs_guard
            .iter()
            .any(|j| j.job.status == "pending" || j.job.status == "downloading");

        if is_processing {
            return;
        }

        jobs_guard
            .iter()
            .find(|j| j.job.status == "queued")
            .map(|j| (j.job.id.clone(), j.job.url.clone(), j.job.metadata.clone()))
    };

    if next_job_info.is_none() {
        return;
    }

    let (id, url, metadata) = next_job_info.unwrap();

    {
        let mut jobs_guard = manager.jobs.lock().unwrap();
        if let Some(job_state) = jobs_guard.iter_mut().find(|j| j.job.id == id) {
            job_state.job.status = "pending".into();
        }
    }
    manager.emit_update(&app);

    let config_state = app.state::<crate::config::ConfigState>();
    let library_path = {
        let config_guard = config_state.lock().unwrap();
        config_guard.as_ref().unwrap().library_path.clone()
    };

    let result = run_download(url, id.clone(), app.clone(), library_path, metadata).await;

    if let Err(e) = result {
        let error_msg = e.to_string();
        let is_cancelled = error_msg == "Download cancelled";

        manager.update_job_status(&app, &id, "error", 0.0);

        let _ = app.emit(
            "download://error",
            DownloadErrorPayload {
                id: id.clone(),
                error: error_msg,
                is_cancelled,
            },
        );
    }

    manager.update_job_status(&app, &id, "completed", 100.0);
    manager.trigger_processing(&app);
}
