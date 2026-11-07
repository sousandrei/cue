import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { Button } from "../button";
import { ToastProvider, toast } from "./toast";

function Example({ onAction }: { onAction: () => void }) {
	return (
		<ToastProvider>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					onClick={() =>
						toast.info("Update available", {
							id: "story-action",
							duration: Infinity,
							action: { label: "Update now", onClick: onAction },
						})
					}
				>
					Show action
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast.warning("Some tracks need attention", {
							description: "Check their source links before syncing.",
						})
					}
				>
					Show warning
				</Button>
				<Button
					onClick={() =>
						toast.success("Track added", {
							id: "story-notice",
							description: "Ready for your next set.",
							duration: Infinity,
						})
					}
				>
					Show notification
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast.loading("Preparing your library", { id: "story-progress" })
					}
				>
					Start task
				</Button>
				<Button
					variant="outline"
					onClick={() =>
						toast.success("Library ready", { id: "story-progress" })
					}
				>
					Finish task
				</Button>
			</div>
		</ToastProvider>
	);
}
const meta = {
	title: "UI/Toast",
	component: Example,
	args: { onAction: fn() },
	beforeEach: () => {
		toast.dismiss();
	},
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CompactConfirmation: Story = {
	render: () => (
		<ToastProvider>
			<Button
				onClick={() =>
					toast.success("Added to queue", {
						id: "story-compact",
						duration: Infinity,
					})
				}
			>
				Show confirmation
			</Button>
		</ToastProvider>
	),
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Show confirmation" }),
		);
		const notification = await within(document.body).findByRole("dialog", {
			name: "Added to queue",
		});
		await expect(notification.getBoundingClientRect().width).toBeLessThan(250);
		await expect(notification.scrollWidth).toBeLessThanOrEqual(
			notification.clientWidth,
		);
	},
};

export const LongMessage: Story = {
	render: () => (
		<ToastProvider>
			<Button
				onClick={() =>
					toast.info("Some tracks are already in your collection", {
						id: "story-long",
						duration: Infinity,
						description:
							"Existing tracks were skipped. Your remaining tracks are queued and will appear in the collection when downloading finishes.",
					})
				}
			>
				Show detailed notification
			</Button>
		</ToastProvider>
	),
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", {
				name: "Show detailed notification",
			}),
		);
		const notification = await within(document.body).findByRole("dialog", {
			name: "Some tracks are already in your collection",
		});
		await expect(
			notification.getBoundingClientRect().width,
		).toBeLessThanOrEqual(288);
		await expect(notification.scrollWidth).toBeLessThanOrEqual(
			notification.clientWidth,
		);
		await waitFor(() =>
			expect(
				within(notification).getByText(/Existing tracks were skipped/),
			).toBeVisible(),
		);
	},
};

export const ActionDismisses: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Show action" }),
		);
		const action = await within(document.body).findByRole("button", {
			name: "Update now",
		});
		await waitFor(() => expect(action).toBeVisible());
		await userEvent.dblClick(action);
		await expect(args.onAction).toHaveBeenCalledOnce();
		await waitFor(() =>
			expect(
				within(document.body).queryByText("Update available"),
			).not.toBeInTheDocument(),
		);
	},
};
export const Warning: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Show warning" }),
		);
		await waitFor(() =>
			expect(
				within(document.body).getByText("Some tracks need attention"),
			).toBeVisible(),
		);
	},
};
export const Dismissible: Story = {
	play: async ({ canvasElement }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Show notification" }),
		);
		await waitFor(() =>
			expect(within(document.body).getByText("Track added")).toBeVisible(),
		);
		await userEvent.click(
			within(document.body).getByRole("button", {
				name: "Dismiss notification",
			}),
		);
		await waitFor(() =>
			expect(
				within(document.body).queryByText("Track added"),
			).not.toBeInTheDocument(),
		);
	},
};
export const TaskLifecycle: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Start task" }));
		await waitFor(() =>
			expect(
				within(document.body).getByText("Preparing your library"),
			).toBeVisible(),
		);
		await userEvent.click(canvas.getByRole("button", { name: "Finish task" }));
		await waitFor(() =>
			expect(within(document.body).getByText("Library ready")).toBeVisible(),
		);
		await expect(
			within(document.body).queryByText("Preparing your library"),
		).not.toBeInTheDocument();
	},
};
