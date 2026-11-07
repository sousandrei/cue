import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { Button } from "../button";
import { ToastProvider, toast } from "./toast";

function Example() {
	return (
		<ToastProvider>
			<div className="flex gap-3">
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
	beforeEach: () => {
		toast.dismiss();
	},
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
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
