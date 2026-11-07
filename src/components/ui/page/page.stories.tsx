import type { Meta, StoryObj } from "@storybook/react";
import { Page } from "./page";

const meta = {
	title: "Layout/Page",
	component: Page,
	args: {
		children: (
			<>
				<h1 className="text-2xl font-semibold">Your collection</h1>
				<p className="text-muted-foreground">
					A shared content width and predictable spacing for every screen.
				</p>
			</>
		),
	},
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Page>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Wide: StoryObj<typeof meta> = { args: { maxWidth: "lg" } };
