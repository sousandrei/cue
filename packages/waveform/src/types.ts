/** Uniformly spaced samples: amplitude and RGB channels, each in [0, 255]. */
export type WaveformPoint = readonly [number, number, number, number];

export interface WaveformBeat {
	time: number;
	beat_number: number;
}

export interface WaveformFrame {
	/** Treat sample and beat arrays as immutable. Beats must be sorted by time. */
	points: readonly WaveformPoint[];
	beats: readonly WaveformBeat[];
	waveformDuration: number;
	duration: number;
	start: number;
	end: number;
	/** Omit for an overview without a playhead. Times are in seconds. */
	position?: number;
	/** Viewport dimensions in CSS pixels. */
	width: number;
	height: number;
	pixelRatio: number;
	/** Only supply while playing, following playback, and in the foreground.
	 * This is the document/rAF timestamp (milliseconds) used to sample position. */
	frameTime?: number;
}
