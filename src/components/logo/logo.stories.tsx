import type { Meta, StoryObj } from "@storybook/react";
import { Logo } from "./logo";

const meta = {
	title: "Layout/Logo",
	component: Logo,
	decorators: [
		(Story) => (
			<figure className="space-y-3">
				<Story />
				<figcaption className="text-xs text-muted-foreground">Cue</figcaption>
			</figure>
		),
	],
} satisfies Meta<typeof Logo>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
