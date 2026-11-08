import type { Meta, StoryObj } from "@storybook/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { RekordboxConnection } from "./rekordbox-connection";

const meta = {
	title: "Music/Rekordbox connection",
	component: RekordboxConnection,
	args: {
		refreshing: false,
		onRefresh: fn(),
		status: {
			supported: true,
			sync_state: "synced",
			watching: true,
			available: true,
			running: false,
			database_path: "/example/master.db",
			checked_at: 0,
			error: null,
			tracks: [
				{
					song_id: "a",
					status: "imported",
					rekordbox_id: "1",
					bpm: 126.5,
					key: "Am",
				},
				{
					song_id: "b",
					status: "not_imported",
					rekordbox_id: null,
					bpm: null,
					key: null,
				},
			],
		},
	},
	decorators: [
		(Story) => (
			<TooltipProvider>
				<div className="flex w-full max-w-3xl justify-end p-5">
					<Story />
				</div>
			</TooltipProvider>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RekordboxConnection>;
export default meta;
type Story = StoryObj<typeof meta>;
async function openDetails(canvasElement: HTMLElement) {
	await userEvent.click(
		within(canvasElement).getByRole("button", {
			name: "Rekordbox connection details",
		}),
	);
	const panel = await within(document.body).findByRole("dialog", {
		name: "Rekordbox",
	});
	await waitFor(() => expect(panel).toBeVisible());
	return within(panel);
}

export const Collapsed: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas
				.getByRole("button", { name: "Rekordbox connection details" })
				.getBoundingClientRect().width,
		).toBeLessThan(180);
		await expect(
			within(document.body).queryByRole("dialog"),
		).not.toBeInTheDocument();
		await expect(
			canvas.queryByText("1 imported · 1 not imported"),
		).not.toBeInTheDocument();
	},
};

export const Connected: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = await openDetails(canvasElement);
		await expect(canvas.getByText("1 imported · 1 not imported")).toBeVisible();
		await userEvent.click(
			canvas.getByRole("button", { name: "Refresh Rekordbox library" }),
		);
		await expect(args.onRefresh).toHaveBeenCalledOnce();
		await expect(
			canvas.queryByRole("button", { name: "Sync playlists" }),
		).not.toBeInTheDocument();
		await expect(canvas.getByText("Up to date")).toBeVisible();
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				within(document.body).queryByRole("dialog"),
			).not.toBeInTheDocument(),
		);
		await expect(
			within(canvasElement).getByRole("button", {
				name: "Rekordbox connection details",
			}),
		).toHaveFocus();
	},
};
export const Unavailable: Story = {
	args: { status: { ...meta.args.status, available: false, tracks: [] } },
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		await expect(panel.getByText("Connection unavailable")).toBeVisible();
		await expect(
			panel.getByRole("button", { name: "Refresh Rekordbox library" }),
		).toBeEnabled();
	},
};

export const UnsupportedPlatform: Story = {
	args: {
		status: {
			...meta.args.status,
			supported: false,
			available: false,
			sync_state: "unsupported",
			tracks: [],
		},
	},
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).queryByRole("button", {
				name: "Rekordbox connection details",
			}),
		).not.toBeInTheDocument();
	},
};
export const Reading: Story = {
	args: { refreshing: true },
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
			"Refreshing…",
		);
		await expect(document.querySelectorAll(".animate-spin")).toHaveLength(1);
		await expect(panel.getByText("1 imported · 1 not imported")).toBeVisible();
		await expect(
			panel.getByRole("button", { name: "Refresh Rekordbox library" }),
		).toBeDisabled();
	},
};
export const RekordboxOpen: Story = {
	args: {
		status: { ...meta.args.status, running: true, sync_state: "pending" },
	},
	play: async ({ canvasElement }) => {
		const canvas = await openDetails(canvasElement);
		await expect(
			canvas.getByText("Changes pending · close Rekordbox to apply."),
		).toBeVisible();
	},
};
export const Syncing: Story = {
	args: { status: { ...meta.args.status, sync_state: "syncing" } },
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
			"Syncing…",
		);
		await expect(document.querySelectorAll(".animate-spin")).toHaveLength(1);
		await expect(
			panel.getByRole("button", { name: "Refresh Rekordbox library" }),
		).toBeDisabled();
	},
};

export const SyncExplanation: Story = {
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		const help = panel.getByRole("button", {
			name: "How automatic Rekordbox sync works",
		});
		help.focus();
		await waitFor(() =>
			expect(within(document.body).getByRole("tooltip")).toBeVisible(),
		);
		await expect(within(document.body).getByRole("tooltip")).toHaveTextContent(
			"Playlist updates wait until Rekordbox is closed to avoid conflicts.",
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				within(document.body).queryByRole("tooltip"),
			).not.toBeInTheDocument(),
		);
	},
};

export const RetryableError: Story = {
	args: {
		status: {
			...meta.args.status,
			sync_state: "error",
			sync_error: "Rekordbox has pending database changes.",
		},
	},
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		await expect(
			panel.getByText("Sync needs attention. Refresh to retry."),
		).toBeVisible();
		await expect(
			panel.getByText("Rekordbox has pending database changes."),
		).toBeVisible();
	},
};

export const PollingFallback: Story = {
	args: { status: { ...meta.args.status, watching: false } },
	play: async ({ canvasElement }) => {
		const panel = await openDetails(canvasElement);
		await expect(
			panel.getByText(
				"Checking periodically · live file watching unavailable.",
			),
		).toBeVisible();
	},
};
