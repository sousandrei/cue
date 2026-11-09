import { expect, test } from "@rstest/core";
import { barSeekTarget } from "./audio";

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
