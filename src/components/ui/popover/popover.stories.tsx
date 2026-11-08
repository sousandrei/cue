import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { Button } from "../button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "./popover";

function Example() {
	return (
		<div className="p-8">
			<Popover>
				<PopoverTrigger render={<Button variant="ghost" />}>
					Open details
				</PopoverTrigger>
				<PopoverContent>
					<PopoverTitle>Connection details</PopoverTitle>
					<PopoverDescription className="mt-2">
						More information, when you need it.
					</PopoverDescription>
				</PopoverContent>
			</Popover>
		</div>
	);
}
const meta = { title: "UI/Popover", component: Example } satisfies Meta<
	typeof Example
>;
export default meta;
export const DismissAndRestoreFocus: StoryObj<typeof meta> = {
	play: async ({ canvasElement }) => {
		const trigger = within(canvasElement).getByRole("button", {
			name: "Open details",
		});
		await userEvent.click(trigger);
		await waitFor(() =>
			expect(
				within(document.body).getByRole("dialog", {
					name: "Connection details",
				}),
			).toBeVisible(),
		);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				within(document.body).queryByRole("dialog"),
			).not.toBeInTheDocument(),
		);
		await expect(trigger).toHaveFocus();
	},
};
