// Storybook supplies its instrumented helpers in the interactive preview.
// Rstest aliases this module to tests/story-runtime.ts to run the same plays.

export { waitFor } from "@testing-library/react";

import {
	expect as storyExpect,
	fn as storyFn,
	userEvent as storyUserEvent,
	within as storyWithin,
} from "storybook/test";
export const expect = storyExpect;
export const fn = storyFn;
export const userEvent = storyUserEvent;
export const within = storyWithin;
