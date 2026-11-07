import type { Meta, StoryObj } from "@storybook/react-vite";
import { Studio } from "./Studio";

const meta = {
	title: "Design system/Studio",
	component: Studio,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Studio>;
export default meta;
export const Overview: StoryObj<typeof meta> = {};
