import type { WaveformBeat } from "./types";

/** Paint just the sorted beats intersecting this surface, in CSS coordinates. */
export function paintBeats(
	context: CanvasRenderingContext2D,
	beats: readonly WaveformBeat[],
	start: number,
	pixelsPerSecond: number,
	width: number,
	height: number,
) {
	let low = 0;
	let high = beats.length;
	while (low < high) {
		const middle = (low + high) >>> 1;
		if (beats[middle].time < start) low = middle + 1;
		else high = middle;
	}
	let lastBeatX = -10;
	for (let index = low; index < beats.length; index++) {
		const beat = beats[index];
		const x = (beat.time - start) * pixelsPerSecond;
		if (x > width) break;
		const downbeat = beat.beat_number === 1;
		if (x - lastBeatX < 3 && !downbeat) continue;
		lastBeatX = x;
		context.fillStyle = downbeat
			? "rgba(255,255,255,0.4)"
			: "rgba(255,255,255,0.18)";
		context.fillRect(x, downbeat ? 0 : height - 6, 1, downbeat ? height : 6);
	}
}
