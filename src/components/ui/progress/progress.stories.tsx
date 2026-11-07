import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "@/test/story";
import { Progress } from "./progress";

const meta = {
	title: "UI/Progress",
	component: Progress,
	args: { value: 64, "aria-label": "Track download", className: "w-80" },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Downloading: Story = {
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByRole("progressbar"),
		).toHaveAttribute("aria-valuenow", "64");
	},
};
export const Waiting: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 100 } };
export const Indeterminate: Story = { args: { value: null } };
