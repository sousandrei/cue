import { paintBeats } from "./beats";
import type { WaveformTile } from "./raster";
import type { WaveformBeat, WaveformFrame } from "./types";
import { waveformWindow } from "./window";

type MotionFrame = WaveformFrame & { position: number; frameTime: number };
// Do not continually restart animations to chase sub-frame audio-clock noise.
const MAX_CLOCK_DRIFT_SECONDS = 1 / 120;

/** Compositor motion is independent of JavaScript's callback frequency. */
export class WaveformMotion {
	private animations: Animation[] = [];
	private tile: WaveformTile | undefined;
	private beats: readonly WaveformBeat[] | undefined;
	private anchor: MotionFrame | undefined;

	constructor(
		private canvas: HTMLCanvasElement,
		private marker: HTMLElement,
		private context: CanvasRenderingContext2D,
	) {}

	update(tile: WaveformTile, frame: MotionFrame) {
		const { position, frameTime, duration, width, height } = frame;
		const span = frame.end - frame.start;
		const scaleX = tile.width / width;
		const scaleY = tile.height / height;
		const changed =
			tile !== this.tile ||
			frame.beats !== this.beats ||
			width !== this.anchor?.width ||
			height !== this.anchor?.height;
		if (changed) {
			this.canvas.width = tile.canvas.width;
			this.canvas.height = tile.canvas.height;
			this.canvas.style.width = `${tile.canvas.width / scaleX}px`;
			this.context.drawImage(tile.canvas, 0, 0);
			this.context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
			paintBeats(
				this.context,
				frame.beats,
				tile.origin / tile.pixelsPerSecond,
				tile.pixelsPerSecond / scaleX,
				tile.canvas.width / scaleX,
				height,
			);
			this.tile = tile;
			this.beats = frame.beats;
		}
		const anchor = this.anchor;
		const expected = anchor
			? Math.min(
					duration,
					anchor.position + (frameTime - anchor.frameTime) / 1000,
				)
			: Number.NaN;
		if (
			!changed &&
			anchor &&
			anchor.duration === duration &&
			Math.abs(expected - position) <= MAX_CLOCK_DRIFT_SECONDS &&
			frameTime >= anchor.frameTime
		)
			return;

		this.cancelAnimations();
		// Stop at the edge of the texture if JS stalls. Never animate blank space
		// into view, or create enormous transforms proportional to track length.
		const lastStart =
			(tile.origin + tile.canvas.width - tile.width - 1) / tile.pixelsPerSecond;
		const until =
			lastStart >= duration - span
				? duration
				: Math.min(duration, lastStart + span / 2);
		const remaining = Math.max(0, until - position);
		const times = [...new Set([position, span / 2, duration - span / 2, until])]
			.filter((time) => time >= position && time <= until)
			.sort((a, b) => a - b);
		const textureFrames: Keyframe[] = [];
		const markerFrames: Keyframe[] = [];
		for (const time of times) {
			const start = waveformWindow(time, duration, span).start;
			const offset = remaining ? (time - position) / remaining : 0;
			textureFrames.push({
				offset,
				transform: `translate3d(${(tile.origin - start * tile.pixelsPerSecond) / scaleX}px,0,0)`,
			});
			markerFrames.push({
				offset,
				transform: `translate3d(${((time - start) / span) * width}px,0,0)`,
			});
		}
		this.marker.style.display = "block";
		this.animate(this.canvas, textureFrames, remaining, frameTime);
		this.animate(this.marker, markerFrames, remaining, frameTime);
		this.anchor = frame;
	}

	private animate(
		element: HTMLElement,
		keyframes: Keyframe[],
		seconds: number,
		frameTime: number,
	) {
		const transform = String(keyframes[0].transform);
		element.style.transform = transform;
		// A pinned viewport needs no animation layer; the playhead can still move.
		if (!seconds || keyframes.every((frame) => frame.transform === transform)) {
			element.style.willChange = "";
			return;
		}
		element.style.willChange = "transform";
		const animation = element.animate(keyframes, {
			duration: seconds * 1000,
			easing: "linear",
			fill: "forwards",
		});
		// rAF timestamps and the document animation timeline share a time origin.
		animation.startTime = frameTime;
		this.animations.push(animation);
	}

	private cancelAnimations() {
		for (const animation of this.animations) animation.cancel();
		this.animations = [];
	}

	stop() {
		if (!this.anchor) return;
		this.cancelAnimations();
		this.tile = undefined;
		this.beats = undefined;
		this.anchor = undefined;
		this.canvas.style.width = "";
		this.canvas.style.transform = "";
		this.canvas.style.willChange = "";
		this.marker.style.display = "none";
		this.marker.style.transform = "";
		this.marker.style.willChange = "";
	}
}
