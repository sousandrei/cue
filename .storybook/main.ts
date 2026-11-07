import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx)"],
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
	framework: "@storybook/react-vite",
	async viteFinal(config) {
		return mergeConfig(config, {
			plugins: [tailwindcss()],
			resolve: { alias: { "@": path.resolve(directory, "../src") } },
			css: { postcss: { plugins: [] } },
		});
	},
};

export default config;
