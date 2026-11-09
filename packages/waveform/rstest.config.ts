import { defineConfig } from "@rstest/core";

const browser = process.env.WAVEFORM_TEST_BROWSER ?? "chromium";
if (browser !== "chromium" && browser !== "webkit" && browser !== "firefox")
	throw new Error(`Unsupported waveform test browser: ${browser}`);

export default defineConfig({
	include: ["packages/waveform/src/**/*.test.ts"],
	browser: { enabled: true, provider: "playwright", browser, headless: true },
});
