import { expect, rs, test } from "@rstest/core";
import { WaveformRaster } from "./raster";
import type { WaveformPoint } from "./types";

const points: WaveformPoint[] = Array.from({ length: 640 }, (_, i) => [
	40 + ((i * 53) % 210),
	(i * 79) % 256,
	(i * 137) % 256,
	(i * 23) % 256,
]);
function surface() {
	const canvas = document.createElement("canvas");
	canvas.width = 64;
	canvas.height = 32;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Canvas 2D unavailable");
	return { canvas, context };
}
function image(context: CanvasRenderingContext2D) {
	return Array.from(context.getImageData(0, 0, 64, 32).data);
}

test("one-pixel scrolls preserve every peak and colour, including cache boundaries", () => {
	const raster = new WaveformRaster();
	const { context } = surface();
	const view = {
		points,
		duration: 10,
		start: 63 / 64,
		end: 63 / 64 + 1,
		width: 64,
		height: 32,
		pixelRatio: 1,
	};
	// Warm the first tile so moving from pixel 63 to 65 crosses its edge.
	raster.draw(context, { ...view, start: 0, end: 1 });
	context.clearRect(0, 0, 64, 32);
	raster.draw(context, view);
	const beforeTile = raster.getTile(view);
	const before = image(context);
	context.clearRect(0, 0, 64, 32);
	raster.draw(context, { ...view, start: 64 / 64, end: 64 / 64 + 1 });
	context.clearRect(0, 0, 64, 32);
	raster.draw(context, { ...view, start: 65 / 64, end: 65 / 64 + 1 });
	const after = image(context);
	expect(
		raster.getTile({ ...view, start: 65 / 64, end: 65 / 64 + 1 }),
	).not.toBe(beforeTile);
	for (let y = 0; y < 32; y++)
		for (let x = 0; x < 62; x++)
			for (let c = 0; c < 4; c++) {
				expect(after[(y * 64 + x) * 4 + c]).toBe(
					before[(y * 64 + x + 2) * 4 + c],
				);
			}
});

test("subpixel scrolling uses the same sampled waveform until the viewport leaves its cache", () => {
	const raster = new WaveformRaster();
	const { context } = surface();
	const view = {
		points,
		duration: 10,
		start: 1,
		end: 2,
		width: 64,
		height: 32,
		pixelRatio: 1,
	};
	const original = context.drawImage.bind(context);
	const frames: { source: CanvasImageSource; x: number }[] = [];
	context.drawImage = (source: CanvasImageSource, ...args: number[]) => {
		frames.push({ source, x: args[0] });
		original(
			source,
			...(args as [
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
			]),
		);
	};
	const fill = rs.spyOn(CanvasRenderingContext2D.prototype, "fillRect");
	try {
		raster.draw(context, view);
		const rasterized = fill.mock.calls.length;
		raster.draw(context, {
			...view,
			start: 1 + 0.25 / 64,
			end: 2 + 0.25 / 64,
		});
		expect(fill.mock.calls.length).toBe(rasterized);
		expect(frames[1].source).toBe(frames[0].source);
		expect(frames[1].x - frames[0].x).toBeCloseTo(0.25);
		const tile = frames[1].source as HTMLCanvasElement;
		expect(tile.width).toBeLessThanOrEqual(view.width * 2 + 2);
	} finally {
		fill.mockRestore();
	}
});

test("zoom changes rebuild at the new scale rather than stretching the old peaks", () => {
	const raster = new WaveformRaster();
	const { context } = surface();
	const view = {
		points,
		duration: 10,
		start: 1,
		end: 2,
		width: 64,
		height: 32,
		pixelRatio: 1,
	};
	raster.draw(context, view);
	context.clearRect(0, 0, 64, 32);
	const zoom = { ...view, end: 1.5 };
	raster.draw(context, zoom);
	const zoomed = image(context);
	context.clearRect(0, 0, 64, 32);
	new WaveformRaster().draw(context, zoom);
	expect(image(context)).toEqual(zoomed);
});

test("fractional movement blends colour boundaries instead of snapping between peaks", () => {
	const raster = new WaveformRaster();
	const { context } = surface();
	const view = {
		points: [
			[255, 255, 0, 0],
			[255, 0, 0, 255],
			[255, 255, 0, 0],
			[255, 0, 0, 255],
		] as WaveformPoint[],
		duration: 4,
		start: 0,
		end: 4,
		width: 64,
		height: 32,
		pixelRatio: 1,
	};
	raster.draw(context, view);
	const before = context.getImageData(15, 16, 1, 1).data;
	expect(before[0]).toBe(255);
	expect(before[2]).toBe(0);
	context.clearRect(0, 0, 64, 32);
	raster.draw(context, { ...view, start: 0.25 / 16, end: 4 + 0.25 / 16 });
	const after = context.getImageData(15, 16, 1, 1).data;
	expect(after[0]).toBeGreaterThan(150);
	expect(after[0]).toBeLessThan(240);
	expect(after[2]).toBeGreaterThan(10);
	expect(after[2]).toBeLessThan(100);
});
