import type { Meta, StoryObj } from "@storybook/react";
import { DownloadList } from "@/components/download-list";
import { DownloadQueueStatus } from "@/components/download-queue-status";
import { DownloadInput } from "@/components/ui/download-input";
import {
	activeDownload,
	completedDownload,
	queuedDownloads,
} from "@/test/fixtures";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { IntakeLayout } from "./intake-layout";

const meta = {
	title: "Layout/Intake",
	component: IntakeLayout,
	parameters: { layout: "fullscreen" },
	args: {
		input: (
			<DownloadInput
				url=""
				setUrl={fn()}
				onAdd={fn()}
				onUpload={fn()}
				loading={false}
			/>
		),
		queue: (
			<DownloadQueueStatus
				downloads={[activeDownload, ...queuedDownloads]}
				onRemove={fn()}
				onClearQueue={fn()}
			/>
		),
		history: (
			<DownloadList
				fill
				downloads={Array.from({ length: 40 }, (_, index) => ({
					...completedDownload,
					id: `history-${index}`,
				}))}
				removeDownload={fn()}
				onClear={fn()}
			/>
		),
	},
} satisfies Meta<typeof IntakeLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

async function verifyLayout(canvasElement: HTMLElement) {
	const canvas = within(canvasElement);
	const progress = canvas.getByRole("progressbar");
	const history = canvas.getByRole("region", {
		name: "Recent activity history",
	});
	// The complete queue must precede history, with no intermediate clipped scroll pane.
	await expect(progress.getBoundingClientRect().bottom).toBeLessThan(
		history.getBoundingClientRect().top,
	);
	for (
		let parent = progress.parentElement;
		parent && parent !== canvasElement;
		parent = parent.parentElement
	) {
		const overflow = getComputedStyle(parent).overflowY;
		if (overflow === "auto" || overflow === "hidden") {
			await expect(parent.scrollHeight - parent.clientHeight).toBeLessThan(2);
		}
	}
	await expect(history.scrollHeight).toBeGreaterThan(history.clientHeight);
	history.scrollTop = 200;
	await expect(history.scrollTop).toBe(200);
}

export const ActiveDownload: Story = {
	play: async ({ canvasElement }) => verifyLayout(canvasElement),
};
export const ExpandedQueue: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Queue (2)" }));
		await waitFor(() =>
			expect(
				canvas.getByRole("button", {
					name: "Remove Velvet Frequency from queue",
				}),
			).toBeVisible(),
		);
		await verifyLayout(canvasElement);
	},
};

export const DownloadingWithoutHistory: Story = {
	args: {
		historyEmpty: true,
		history: (
			<DownloadList
				fill
				downloads={[activeDownload]}
				removeDownload={fn()}
				onClear={fn()}
			/>
		),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const history = canvas.getByRole("region", {
			name: "Recent activity history",
		});
		const empty = canvas.getByText("No recent activity");
		await waitFor(() => expect(empty).toBeVisible());
		await expect(history.getBoundingClientRect().height).toBeLessThan(100);
		await expect(empty.getBoundingClientRect().bottom).toBeLessThan(
			history.getBoundingClientRect().bottom,
		);
		await expect(history.scrollHeight - history.clientHeight).toBeLessThan(2);
	},
};
