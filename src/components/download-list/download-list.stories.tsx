import type { Meta, StoryObj } from "@storybook/react";
import { completedDownload, failedDownload } from "@/test/fixtures";
import { expect, fn, userEvent, within } from "@/test/story";
import { DownloadList } from "./download-list";

const meta = {
	title: "Music/Recent activity",
	component: DownloadList,
	args: {
		downloads: [completedDownload, failedDownload],
		removeDownload: fn(),
		onClear: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-full max-w-2xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DownloadList>;
export default meta;
export const History: StoryObj<typeof meta> = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Clear history" }),
		);
		await expect(args.onClear).toHaveBeenCalledOnce();
	},
};
export const Empty: StoryObj<typeof meta> = { args: { downloads: [] } };
