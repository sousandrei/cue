import { expect, test } from "@rstest/core";
import { barSeekTarget, waveformWindow } from "./audio";

const grid = [0, 2, 4, 7, 10].map((time) => ({
	time,
	beat_number: 1,
	bpm: 120,
}));
test("bar jumps preserve musical position through tempo changes", () => {
	expect(barSeekTarget(3, 1, grid)).toBe(5.5);
	expect(barSeekTarget(5.5, -1, grid)).toBe(3);
	expect(barSeekTarget(0.5, -1, grid)).toBe(-1.5);
	expect(barSeekTarget(10, 1, grid)).toBe(13);
});
test("missing grids use a short fallback and known tempos use four beats", () => {
	expect(barSeekTarget(10, -1, [])).toBe(9);
	expect(barSeekTarget(10, 1, [{ time: 0, beat_number: 1, bpm: 120 }])).toBe(
		12,
	);
});
test("detail windows follow playback and stay within the song", () => {
	expect(waveformWindow(1, 100, 16)).toEqual({ start: 0, end: 16 });
	expect(waveformWindow(50, 100, 16)).toEqual({ start: 42, end: 58 });
	expect(waveformWindow(99, 100, 16)).toEqual({ start: 84, end: 100 });
	expect(waveformWindow(1, 5, 16)).toEqual({ start: 0, end: 5 });
});
