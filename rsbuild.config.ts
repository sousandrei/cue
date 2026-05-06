import { fileURLToPath } from "node:url";
import path from "node:path";
import { type RsbuildConfig, defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.TAURI_DEV_HOST;

const config: RsbuildConfig = {
	plugins: [pluginReact()],
	source: {
		entry: {
			index: "./src/main.tsx",
		},
	},
	html: {
		template: "./index.html",
	},
	output: {
		cleanDistPath: true,
	},
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
	},
	dev: {
		assetPrefix: true,
		client: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
	},
	tools: {
		rspack: {
			watchOptions: {
				ignored: ["**/src-tauri/**"],
			},
			resolve: {
				alias: {
					"@": path.resolve(__dirname, "src"),
				},
			},
			plugins: [
				TanStackRouterRspack({
					target: "react",
					autoCodeSplitting: true,
				}),
			],
		},
	},
};

export default defineConfig(config);
