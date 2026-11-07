import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./header";

const meta = { title: "Layout/Header", component: Header } satisfies Meta<
	typeof Header
>;
export default meta;
export const Intake: StoryObj<typeof meta> = {};
export const Collection: StoryObj<typeof meta> = {
	args: {
		title: "Collection",
		subtitle: "Your tracks, ready for the next set.",
	},
};
