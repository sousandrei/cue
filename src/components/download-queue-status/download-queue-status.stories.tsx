import type { Meta, StoryObj } from "@storybook/react";
import { activeDownload, queuedDownloads } from "@/test/fixtures";
import { fn } from "@/test/story";
import { DownloadQueueStatus } from "./download-queue-status";

const meta = {
	title: "Music/Download queue",
	component: DownloadQueueStatus,
	args: {
		downloads: [activeDownload, ...queuedDownloads],
		onRemove: fn(),
		onClearQueue: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-full max-w-2xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DownloadQueueStatus>;
export default meta;
export const Active: StoryObj<typeof meta> = {};
export const QueuedOnly: StoryObj<typeof meta> = {
	args: { downloads: queuedDownloads },
};
export const Empty: StoryObj<typeof meta> = { args: { downloads: [] } };
