import path from "node:path";
import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig, defineInlineProject } from "@rstest/core";

export default defineConfig({
	projects: [
		defineInlineProject({
			name: "app",
			plugins: [pluginReact()],
			include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
			setupFiles: ["./tests/setup.ts"],
			resolve: {
				alias: {
					"@/test/story": path.resolve("tests/story-runtime.ts"),
					"@": path.resolve("src"),
				},
			},
			browser: {
				enabled: true,
				provider: "playwright",
				browser: "chromium",
				headless: true,
			},
		}),
		"packages/*/rstest.config.ts",
	],
});
