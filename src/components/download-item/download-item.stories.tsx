import type { Meta, StoryObj } from "@storybook/react";
import { completedDownload, failedDownload } from "@/test/fixtures";
import { expect, fn, userEvent, within } from "@/test/story";
import { DownloadItem } from "./download-item";

const meta = {
	title: "Music/History item",
	component: DownloadItem,
	args: { download: completedDownload, removeDownload: fn() },
	decorators: [
		(Story) => (
			<div className="w-full max-w-2xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DownloadItem>;
export default meta;
export const Complete: StoryObj<typeof meta> = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", {
				name: "Remove Midnight Signal from history",
			}),
		);
		await expect(args.removeDownload).toHaveBeenCalledWith(
			completedDownload.id,
		);
	},
};
export const Failed: StoryObj<typeof meta> = {
	args: { download: failedDownload },
};
