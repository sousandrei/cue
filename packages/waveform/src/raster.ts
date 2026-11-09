import type { WaveformPoint } from "./types";

export interface RasterView {
	points: readonly WaveformPoint[];
	duration: number;
	start: number;
	end: number;
	/** Integer backing-store pixels. */
	width: number;
	height: number;
	pixelRatio: number;
}

export interface WaveformTile extends RasterView {
	canvas: HTMLCanvasElement;
	span: number;
	origin: number;
	pixelsPerSecond: number;
}

/** Track-anchored bins preserve peak colours across subpixel motion and refills.
 * Storage is bounded by two viewport widths plus a one-pixel sampling border. */
export class WaveformRaster {
	private tile: WaveformTile | undefined;

	getTile(view: RasterView, aheadPixels = 0): WaveformTile | undefined {
		const { points, duration, start, end, width, height, pixelRatio } = view;
		const span = end - start;
		if (duration <= 0 || span <= 0 || width <= 0 || height <= 0) return;
		let tile = this.tile;
		const compatible =
			tile &&
			tile.points === points &&
			tile.duration === duration &&
			tile.width === width &&
			tile.height === height &&
			tile.pixelRatio === pixelRatio &&
			// Subtracting moving timestamps introduces tiny span differences.
			Math.abs(tile.span - span) <= span * 1e-10;
		const pixelsPerSecond =
			compatible && tile ? tile.pixelsPerSecond : width / span;
		const firstPixel = start * pixelsPerSecond;
		if (
			!compatible ||
			!tile ||
			firstPixel < tile.origin + 1 ||
			firstPixel + width + aheadPixels > tile.origin + tile.canvas.width - 1
		) {
			const canvas = tile?.canvas ?? document.createElement("canvas");
			const raster = canvas.getContext("2d");
			if (!raster) return;
			const origin = Math.floor(firstPixel) - 1;
			canvas.width = width * 2 + 2;
			canvas.height = height;
			for (let column = 0; points.length && column < canvas.width; column++) {
				const from = Math.floor(
					((origin + column) / pixelsPerSecond / duration) * points.length,
				);
				const to = Math.min(
					points.length,
					Math.max(
						from + 1,
						Math.ceil(
							((origin + column + 1) / pixelsPerSecond / duration) *
								points.length,
						),
					),
				);
				let peak = points[from];
				if (!peak) continue;
				for (let index = from + 1; index < to; index++)
					if (points[index][0] > peak[0]) peak = points[index];
				const amplitude = Math.max(
					pixelRatio,
					(peak[0] / 255) * (height - 8 * pixelRatio),
				);
				raster.fillStyle = `rgb(${peak[1]}, ${peak[2]}, ${peak[3]})`;
				raster.fillRect(column, (height - amplitude) / 2, 1, amplitude);
			}
			tile = { ...view, canvas, span, origin, pixelsPerSecond };
			this.tile = tile;
		}
		return tile;
	}

	draw(context: CanvasRenderingContext2D, view: RasterView) {
		const tile = this.getTile(view);
		if (!tile) return;
		const { start, width, height } = view;
		context.imageSmoothingEnabled = true;
		context.drawImage(
			tile.canvas,
			start * tile.pixelsPerSecond - tile.origin,
			0,
			width,
			height,
			0,
			0,
			width,
			height,
		);
	}

	dispose() {
		if (!this.tile) return;
		this.tile.canvas.width = 0;
		this.tile.canvas.height = 0;
		this.tile = undefined;
	}
}
