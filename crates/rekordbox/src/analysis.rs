use anyhow::{ensure, Result};
use rbox_anlz::{Anlz, BeatGrid};
use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
    time::SystemTime,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisBeat {
    pub time: f64,
    pub beat_number: u16,
    pub bpm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackAnalysis {
    /// [height, red, green, blue], each in 0..=255, evenly spaced across the waveform.
    pub waveform: Vec<[u8; 4]>,
    pub waveform_kind: String,
    /// Detailed ANLZ waveforms have 150 samples per second. Preview-only data has no timebase.
    pub waveform_duration: Option<f64>,
    pub beats: Vec<AnalysisBeat>,
}

type Fingerprint = Vec<(PathBuf, u64, Option<SystemTime>)>;
struct CacheEntry {
    fingerprint: Fingerprint,
    analysis: TrackAnalysis,
}
static CACHE: OnceLock<Mutex<VecDeque<CacheEntry>>> = OnceLock::new();

fn beats(grid: &BeatGrid) -> Vec<AnalysisBeat> {
    grid.beats
        .iter()
        .map(|beat| AnalysisBeat {
            time: (f64::from(beat.time) + f64::from(grid.grid_offset())) / 1000.,
            beat_number: beat.beat_number,
            bpm: f64::from(beat.tempo) / 100.,
        })
        .collect()
}

// Keep the largest peak in each equally sized time bucket, bounding IPC and drawing costs.
fn reduce(points: Vec<[u8; 4]>) -> Vec<[u8; 4]> {
    let count = points.len().min(65536);
    (0..count)
        .map(|bucket| {
            *points[bucket * points.len() / count..(bucket + 1) * points.len() / count]
                .iter()
                .max_by_key(|point| point[0])
                .unwrap()
        })
        .collect()
}

fn detailed(file: &mut Anlz, analysis: &mut TrackAnalysis) {
    // RGB is already encoded by Rekordbox; preserve its colors rather than estimating bands.
    if let Ok(Some(wave)) = file.get_waveform_color_detail() {
        if !wave.data.is_empty() {
            analysis.waveform_duration = Some(wave.data.len() as f64 / 150.);
            analysis.waveform_kind = "rgb".into();
            analysis.waveform = reduce(
                wave.data
                    .iter()
                    .map(|p| {
                        [
                            (u16::from(p.full_height()) * 255 / 127) as u8,
                            (u16::from(p.red()) * 255 / 7) as u8,
                            (u16::from(p.green()) * 255 / 7) as u8,
                            (u16::from(p.blue()) * 255 / 7) as u8,
                        ]
                    })
                    .collect(),
            );
        }
    }
    if analysis.waveform_kind != "rgb" {
        if let Ok(Some(wave)) = file.get_waveform_3band_detail() {
            if !wave.data.is_empty() {
                analysis.waveform_duration = Some(wave.data.len() as f64 / 150.);
                analysis.waveform_kind = "three_band".into();
                analysis.waveform = reduce(
                    wave.data
                        .iter()
                        .map(|p| {
                            [
                                p.low().max(p.mid()).max(p.high()),
                                p.low(),
                                p.mid(),
                                p.high(),
                            ]
                        })
                        .collect(),
                );
            }
        }
    }
    if analysis.waveform.is_empty() {
        if let Ok(Some(wave)) = file.get_waveform_detail() {
            if !wave.data.is_empty() {
                analysis.waveform_duration = Some(wave.data.len() as f64 / 150.);
                analysis.waveform_kind = "monochrome".into();
                analysis.waveform = reduce(
                    wave.data
                        .iter()
                        .map(|p| [(u16::from(p.height()) * 255 / 31) as u8, 167, 151, 255])
                        .collect(),
                );
            }
        }
    }
}

pub fn read_analysis(root: &Path, relative: &str) -> Result<Option<TrackAnalysis>> {
    let root = match root.canonicalize() {
        Ok(root) => root,
        Err(_) => return Ok(None),
    };
    let dat = root.join(relative.trim_start_matches(['/', '\\']));
    if !dat.exists() {
        return Ok(None);
    }
    let dat = dat.canonicalize()?;
    ensure!(
        dat.starts_with(&root),
        "Analysis path is outside Rekordbox storage"
    );
    let mut fingerprint = Vec::new();
    for path in [&dat, &dat.with_extension("EXT"), &dat.with_extension("2EX")] {
        if let Ok(metadata) = path.metadata() {
            ensure!(
                path.canonicalize()?.starts_with(&root),
                "Analysis path is outside Rekordbox storage"
            );
            fingerprint.push((path.clone(), metadata.len(), metadata.modified().ok()));
        }
    }
    let cache = CACHE.get_or_init(|| Mutex::new(VecDeque::new()));
    if let Some(hit) = cache
        .lock()
        .map_err(|e| anyhow::anyhow!("{e}"))?
        .iter()
        .find(|entry| entry.fingerprint == fingerprint)
    {
        return Ok(Some(hit.analysis.clone()));
    }
    let mut file = Anlz::load(&dat)?;
    let mut analysis = TrackAnalysis {
        waveform: Vec::new(),
        waveform_kind: "monochrome".into(),
        waveform_duration: None,
        beats: Vec::new(),
    };
    if let Ok(Some(grid)) = file.get_beat_grid() {
        analysis.beats = beats(grid);
    }
    // Optional sections may be absent, corrupt, or still being written by Rekordbox.
    for extension in ["EXT", "2EX"] {
        if let Ok(mut file) = Anlz::load(dat.with_extension(extension)) {
            detailed(&mut file, &mut analysis);
        }
    }
    if analysis.waveform.is_empty() {
        if let Ok(Some(wave)) = file.get_waveform_preview() {
            analysis.waveform = wave
                .data
                .iter()
                .map(|p| [(u16::from(p.height()) * 255 / 31) as u8, 167, 151, 255])
                .collect();
        }
    }
    if analysis.waveform.is_empty() && analysis.beats.is_empty() {
        return Ok(None);
    }
    let mut cache = cache.lock().map_err(|e| anyhow::anyhow!("{e}"))?;
    cache.retain(|entry| entry.fingerprint.first().map(|f| &f.0) != Some(&dat));
    if cache.len() >= 8 {
        cache.pop_front();
    }
    cache.push_back(CacheEntry {
        fingerprint,
        analysis: analysis.clone(),
    });
    Ok(Some(analysis))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbox_anlz::{Beat, WaveformColorDetail, WaveformColorDetailColumn};

    #[test]
    fn reads_rgb_grid_offsets_and_invalidates_cached_analysis() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("ANLZ0000.DAT");
        let mut dat = Anlz::new_dat(&path).unwrap();
        let mut grid = BeatGrid::new(vec![Beat {
            beat_number: 1,
            tempo: 12000,
            time: 500,
        }]);
        grid.set_grid_offset(-25);
        dat.set_beat_grid(grid).unwrap();
        dat.dump().unwrap();
        let mut ext = Anlz::new_ext(path.with_extension("EXT")).unwrap();
        let point = WaveformColorDetailColumn::new()
            .with_height(31)
            .with_red(7)
            .with_green(3)
            .with_blue(1);
        ext.set_waveform_color_detail(WaveformColorDetail::new(vec![point; 300]))
            .unwrap();
        ext.dump().unwrap();
        let result = read_analysis(root.path(), "/ANLZ0000.DAT")
            .unwrap()
            .unwrap();
        assert_eq!(result.waveform_kind, "rgb");
        assert_eq!(result.waveform_duration, Some(2.));
        assert_eq!(result.waveform[0][1], 255);
        assert_eq!(result.beats[0].time, 0.475);
        ext.set_waveform_color_detail(WaveformColorDetail::new(vec![point; 450]))
            .unwrap();
        ext.dump().unwrap();
        assert_eq!(
            read_analysis(root.path(), "/ANLZ0000.DAT")
                .unwrap()
                .unwrap()
                .waveform_duration,
            Some(3.)
        );
    }

    #[test]
    fn bounds_peaks_and_preserves_transients() {
        let mut points = vec![[0; 4]; 200000];
        points[7] = [255, 255, 0, 0];
        let reduced = reduce(points);
        assert_eq!(reduced.len(), 65536);
        assert!(reduced.contains(&[255, 255, 0, 0]));
        assert!(reduce(vec![]).is_empty());
    }
}
