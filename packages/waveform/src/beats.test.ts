import { expect, test } from "@rstest/core";
import { paintBeats } from "./beats";

function surface() {
	const canvas = document.createElement("canvas");
	canvas.width = 64;
	canvas.height = 32;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Missing context");
	return context;
}

test("only paints beats inside the requested surface, preserving downbeat emphasis", () => {
	const context = surface();
	paintBeats(
		context,
		[
			{ time: 1, beat_number: 1 },
			{ time: 12, beat_number: 1 },
			{ time: 14, beat_number: 2 },
			{ time: 30, beat_number: 1 },
		],
		10,
		4,
		64,
		32,
	);
	const alpha = (x: number, y: number) =>
		context.getImageData(x, y, 1, 1).data[3];
	// Downbeats span the height; other beats occupy the bottom six pixels.
	expect(alpha(8, 1)).toBeGreaterThan(0);
	expect(alpha(16, 1)).toBe(0);
	expect(alpha(16, 30)).toBeGreaterThan(0);
	expect(alpha(0, 1)).toBe(0);
});

test("dense beat grids retain downbeats without filling every neighbouring pixel", () => {
	const context = surface();
	paintBeats(
		context,
		[
			{ time: 0, beat_number: 2 },
			{ time: 1, beat_number: 3 },
			{ time: 2, beat_number: 1 },
		],
		0,
		1,
		64,
		32,
	);
	expect(context.getImageData(1, 30, 1, 1).data[3]).toBe(0);
	expect(context.getImageData(2, 1, 1, 1).data[3]).toBeGreaterThan(0);
});
