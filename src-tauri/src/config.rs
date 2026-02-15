use serde::{Deserialize, Serialize};
use std::{fs, sync::Mutex};

pub type ConfigState = Mutex<Option<Config>>;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub library_path: String,
    pub yt_dlp_version: String,
    pub ffmpeg_version: String,
    pub bun_version: String,
    pub ejs_version: String,
    #[serde(default = "default_auto_update")]
    pub auto_update: bool,
}

fn default_auto_update() -> bool {
    true
}

impl Default for Config {
    fn default() -> Self {
        let library_path = dirs::audio_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .map(|h| h.join("Music").to_string_lossy().to_string())
                    .unwrap_or_else(|| ".".to_string())
            });

        Self {
            library_path,
            yt_dlp_version: "2026.02.04".to_string(),
            ffmpeg_version: "7.1".to_string(),
            bun_version: "1.3.9".to_string(),
            ejs_version: "0.4.0".to_string(),
            auto_update: true,
        }
    }
}

pub fn load_config() -> Result<Option<Config>, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("cue");
    let config_path = config_dir.join("config.yaml");

    if !config_path.exists() {
        return Ok(None);
    }

    let config_content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: Config = serde_yaml::from_str(&config_content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(Some(config))
}

pub fn save_config(config: &Config) -> Result<(), String> {
    let config_dir = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("cue");
    let config_path = config_dir.join("config.yaml");

    // Ensuring directory exists is handled by load_config/init but safe to do here if needed
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    let config_str =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, config_str)
        .map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}
