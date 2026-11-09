import { paintBeats } from "./beats";
import { WaveformMotion } from "./motion";
import { WaveformRaster } from "./raster";
import type { WaveformFrame } from "./types";
import { waveformWindow } from "./window";

// Cover the next quarter second between JS callbacks, capped at 1/4 viewport.
const REFILL_AHEAD_SECONDS = 0.25;

/** Owns rendering resources only: no timers, framework state, audio, or focus APIs. */
export class WaveformRenderer {
	private raster = new WaveformRaster();
	private context: CanvasRenderingContext2D | null;
	private motion: WaveformMotion | undefined;
	private disposed = false;

	constructor(
		private canvas: HTMLCanvasElement,
		marker: HTMLElement,
	) {
		this.context = canvas.getContext("2d");
		if (
			this.context &&
			typeof canvas.animate === "function" &&
			typeof marker.animate === "function"
		)
			this.motion = new WaveformMotion(canvas, marker, this.context);
	}

	render(frame: WaveformFrame) {
		if (this.disposed) throw new Error("Cannot render a disposed waveform");
		const { width, height, pixelRatio, duration } = frame;
		const span = frame.end - frame.start;
		if (
			![width, height, pixelRatio, duration, frame.start, frame.end].every(
				Number.isFinite,
			) ||
			width <= 0 ||
			height <= 0 ||
			pixelRatio <= 0 ||
			duration <= 0 ||
			span <= 0 ||
			(frame.position !== undefined && !Number.isFinite(frame.position)) ||
			(frame.frameTime !== undefined && !Number.isFinite(frame.frameTime))
		) {
			this.clear();
			return;
		}
		const context = this.context;
		if (!context) return;
		const backingWidth = Math.max(1, Math.round(width * pixelRatio));
		const backingHeight = Math.max(1, Math.round(height * pixelRatio));
		const position =
			frame.position === undefined
				? undefined
				: Math.max(0, Math.min(duration, frame.position));
		const view =
			this.motion && frame.frameTime !== undefined && position !== undefined
				? waveformWindow(position, duration, span)
				: { start: frame.start, end: frame.end };
		const rasterView = {
			points: frame.points,
			duration:
				Number.isFinite(frame.waveformDuration) && frame.waveformDuration > 0
					? frame.waveformDuration
					: duration,
			...view,
			width: backingWidth,
			height: backingHeight,
			pixelRatio,
		};
		if (
			this.motion &&
			position !== undefined &&
			frame.frameTime !== undefined
		) {
			const ahead = Math.min(
				backingWidth * 0.25,
				(backingWidth * REFILL_AHEAD_SECONDS) / (view.end - view.start),
			);
			const tile = this.raster.getTile(rasterView, ahead);
			if (tile) {
				this.motion.update(tile, {
					...frame,
					...view,
					position,
					frameTime: frame.frameTime,
				});
				return;
			}
		}
		this.stop();
		if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
		if (this.canvas.height !== backingHeight)
			this.canvas.height = backingHeight;
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, backingWidth, backingHeight);
		this.raster.draw(context, rasterView);
		context.setTransform(
			backingWidth / width,
			0,
			0,
			backingHeight / height,
			0,
			0,
		);
		const pixelsPerSecond = width / (view.end - view.start);
		paintBeats(
			context,
			frame.beats,
			view.start,
			pixelsPerSecond,
			width,
			height,
		);
		if (position !== undefined) {
			context.fillStyle = "white";
			context.fillRect((position - view.start) * pixelsPerSecond, 0, 2, height);
		}
	}

	private stop() {
		this.motion?.stop();
	}

	private clear() {
		this.stop();
		this.raster.dispose();
		if (this.canvas.width) this.canvas.width = 0;
		if (this.canvas.height) this.canvas.height = 0;
	}

	/** Cancel animations and release backing stores. Safe to call repeatedly. */
	dispose() {
		this.clear();
		this.disposed = true;
	}
}
