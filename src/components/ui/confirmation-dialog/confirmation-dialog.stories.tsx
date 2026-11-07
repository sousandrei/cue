import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { Button } from "../button";
import { ConfirmationDialog } from "./confirmation-dialog";

function Example({
	busy = false,
	defaultOpen = false,
	onConfirm,
}: {
	busy?: boolean;
	defaultOpen?: boolean;
	onConfirm: () => void;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<>
			<Button variant="destructive" onClick={() => setOpen(true)}>
				Factory reset
			</Button>
			<ConfirmationDialog
				open={open}
				onOpenChange={setOpen}
				title="Reset Cue?"
				description="This deletes local configuration and utilities. The application will restart."
				confirmLabel="Reset Cue"
				busy={busy}
				onConfirm={() => {
					onConfirm();
					setOpen(false);
				}}
			/>
		</>
	);
}
const meta = {
	title: "Patterns/Confirmation dialog",
	component: Example,
	args: { onConfirm: fn() },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CancelByDefault: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Factory reset" }),
		);
		await waitFor(() =>
			expect(
				within(document.body).getByRole("button", { name: "Cancel" }),
			).toHaveFocus(),
		);
		await userEvent.keyboard("{Enter}");
		await expect(args.onConfirm).not.toHaveBeenCalled();
	},
};
export const Confirm: Story = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", { name: "Factory reset" }),
		);
		await userEvent.click(
			await within(document.body).findByRole("button", { name: "Reset Cue" }),
		);
		await expect(args.onConfirm).toHaveBeenCalledOnce();
	},
};
export const Busy: Story = {
	args: { busy: true, defaultOpen: true },
	play: async () => {
		await waitFor(() =>
			expect(within(document.body).getByRole("alertdialog")).toBeVisible(),
		);
		await expect(
			within(document.body).getByRole("button", { name: "Reset Cue" }),
		).toBeDisabled();
	},
};
