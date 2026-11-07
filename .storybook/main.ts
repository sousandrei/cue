import type { StorybookConfig } from "storybook-react-rsbuild";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx)"],
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
	framework: "storybook-react-rsbuild",
};

export default config;
