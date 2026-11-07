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
export const ScrollableHistory: StoryObj<typeof meta> = {
	render: (args) => (
		<div className="flex h-[420px] flex-col">
			<DownloadList {...args} />
		</div>
	),
	args: {
		fill: true,
		downloads: Array.from({ length: 80 }, (_, index) => ({
			...completedDownload,
			id: `history-${index}`,
		})),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const region = canvas.getByRole("region", {
			name: "Recent activity history",
		});
		const heading = canvas.getByRole("heading", { name: "Recent Activity" });
		await expect(region.scrollHeight).toBeGreaterThan(region.clientHeight);
		const headingTop = heading.getBoundingClientRect().top;
		region.scrollTop = 300;
		await expect(region.scrollTop).toBe(300);
		await expect(heading.getBoundingClientRect().top).toBe(headingTop);
	},
};
