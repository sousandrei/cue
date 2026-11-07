import type { Meta, StoryObj } from "@storybook/react";
import { activeDownload } from "@/test/fixtures";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { ActiveDownloadItem } from "./active-download-item";

const meta = {
	title: "Music/Active download",
	component: ActiveDownloadItem,
	args: { download: activeDownload, onRemove: fn() },
	decorators: [
		(Story) => (
			<div className="w-full max-w-2xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ActiveDownloadItem>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Downloading: Story = {};
export const LogsAndCancel: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const disclosure = canvas.getByRole("button", { name: "Logs" });
		await userEvent.click(disclosure);
		await expect(disclosure).toHaveAttribute("aria-expanded", "true");
		await waitFor(() =>
			expect(canvas.getByText("Retrieving track information")).toBeVisible(),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Cancel Midnight Signal" }),
		);
		await expect(args.onRemove).toHaveBeenCalledWith(activeDownload.id);
	},
};
