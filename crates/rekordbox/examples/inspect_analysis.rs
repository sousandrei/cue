//! Read-only check: cargo run -p cue-rekordbox --example inspect_analysis -- filename-fragment
fn main() -> anyhow::Result<()> {
    let query = std::env::args().nth(1).unwrap_or_default().to_lowercase();
    for track in cue_rekordbox::read_library()?.tracks {
        if !track
            .path
            .as_deref()
            .unwrap_or_default()
            .to_lowercase()
            .contains(&query)
        {
            continue;
        }
        if let Some(analysis) = cue_rekordbox::read_track_analysis(&track.id)? {
            println!(
                "Track {}: {} beats, {} {} waveform points, duration {:?}",
                track.id,
                analysis.beats.len(),
                analysis.waveform.len(),
                analysis.waveform_kind,
                analysis.waveform_duration
            );
        } else {
            println!("Track {}: analysis unavailable", track.id);
        }
    }
    Ok(())
}
