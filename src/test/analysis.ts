import type { TrackAnalysis } from "@/lib/tauri/core/types";

/** Synthetic waveform and beat positions for component stories and tests. */
export const exampleAnalysis: TrackAnalysis = {
	waveform_kind: "rgb",
	waveform_duration: 32,
	waveform: Array.from({ length: 1200 }, (_, index) => {
		const phase = index / 1200;
		const height = Math.round(
			30 +
				Math.abs(Math.sin(index * 0.27)) *
					150 *
					(phase > 0.4 && phase < 0.55 ? 0.2 : 1),
		);
		return [
			height,
			Math.round(120 + 100 * Math.sin(phase * 12) ** 2),
			Math.round(80 + phase * 140),
			Math.round(90 + 140 * Math.cos(phase * 8) ** 2),
		];
	}),
	beats: Array.from({ length: 64 }, (_, index) => ({
		time: index * 0.5,
		beat_number: (index % 4) + 1,
		bpm: 120,
	})),
};
