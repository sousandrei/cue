import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@/test/story";
import { DownloadButton } from "./download-button";

const meta = {
	title: "Patterns/Download button",
	component: DownloadButton,
	args: { onClick: fn() },
} satisfies Meta<typeof DownloadButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Add to queue" }),
		);
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};
export const Busy: Story = {
	args: { loading: true },
	play: async ({ canvasElement, args }) => {
		const button = within(canvasElement).getByRole("button", {
			name: "Adding to queue…",
		});
		await expect(button).toBeDisabled();
		await expect(button).toHaveAttribute("aria-busy", "true");
		await userEvent.click(button);
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};
export const Disabled: Story = { args: { disabled: true } };
