import { defineProject } from "@rstest/core";

export default defineProject({
	name: "@cue/waveform",
	root: import.meta.dirname,
	include: ["src/**/*.test.ts"],
	browser: {
		enabled: true,
		provider: "playwright",
		browser: "chromium",
		headless: true,
	},
});
