import { expect, test } from "@rstest/core";
import { waveformWindow } from "./window";

test.each([
	[0, 32, 8, 0, 8],
	[16, 32, 8, 12, 20],
	[32, 32, 8, 24, 32],
	[2, 4, 8, 0, 4],
	[0, 0, 8, 0, 0],
])(
	"window at %s seconds, duration %s, span %s",
	(position, duration, span, start, end) => {
		expect(waveformWindow(position, duration, span)).toEqual({ start, end });
	},
);
