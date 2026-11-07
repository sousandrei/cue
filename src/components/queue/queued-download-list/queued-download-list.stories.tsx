import type { Meta, StoryObj } from "@storybook/react";
import { queuedDownloads } from "@/test/fixtures";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { QueuedDownloadList } from "./queued-download-list";

const meta = {
	title: "Music/Queued tracks",
	component: QueuedDownloadList,
	args: { downloads: queuedDownloads, onRemove: fn(), onClearQueue: fn() },
	decorators: [
		(Story) => (
			<div className="w-full max-w-2xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof QueuedDownloadList>;
export default meta;
export const ExpandAndClear: StoryObj<typeof meta> = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Queue (2)" }));
		await waitFor(() => expect(canvas.getByText("After Hours")).toBeVisible());
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove After Hours from queue" }),
		);
		await expect(args.onRemove).toHaveBeenCalledWith(queuedDownloads[0].id);
		await userEvent.click(canvas.getByRole("button", { name: "Clear Queue" }));
		await expect(args.onClearQueue).toHaveBeenCalledOnce();
	},
};
