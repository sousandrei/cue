import type { Preview } from "@storybook/react-vite";
import "../src/root.css";

const preview: Preview = {
	parameters: {
		layout: "centered",
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		a11y: { test: "error" },
	},
	tags: ["autodocs"],
};

export default preview;
