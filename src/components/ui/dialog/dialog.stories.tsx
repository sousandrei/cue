import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { Button } from "../button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

function Example({ defaultOpen = false }: { defaultOpen?: boolean }) {
	return (
		<Dialog defaultOpen={defaultOpen}>
			<DialogTrigger render={<Button variant="outline" />}>
				Remove track
			</DialogTrigger>
			<DialogContent>
				<DialogTitle>Remove this track?</DialogTitle>
				<DialogDescription>
					This removes the track from your collection. You can add it again
					later.
				</DialogDescription>
				<DialogFooter>
					<DialogClose render={<Button variant="ghost" />}>
						Keep track
					</DialogClose>
					<DialogClose render={<Button variant="destructive" />}>
						Remove
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
const meta = { title: "UI/Dialog", component: Example } satisfies Meta<
	typeof Example
>;
export default meta;
export const Open: StoryObj<typeof meta> = {
	args: { defaultOpen: true },
	play: async () => {
		await waitFor(() =>
			expect(within(document.body).getByRole("dialog")).toBeVisible(),
		);
	},
};
export const Confirmation: StoryObj<typeof meta> = {
	play: async ({ canvasElement }) => {
		const trigger = within(canvasElement).getByRole("button", {
			name: "Remove track",
		});
		await userEvent.click(trigger);
		const dialog = await within(document.body).findByRole("dialog", {
			name: "Remove this track?",
		});
		await waitFor(() => expect(dialog).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				within(document.body).queryByRole("dialog"),
			).not.toBeInTheDocument(),
		);
		await expect(trigger).toHaveFocus();
	},
};
