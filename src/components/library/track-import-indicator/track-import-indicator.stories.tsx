import type { Meta, StoryObj } from "@storybook/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { TrackImportIndicator } from "./track-import-indicator";

const meta = {
	title: "Music/Track import indicator",
	component: TrackImportIndicator,
	args: { title: "Example track", status: "not_imported" },
	decorators: [
		(Story) => (
			<TooltipProvider>
				<div className="p-8">
					<Story />
				</div>
			</TooltipProvider>
		),
	],
} satisfies Meta<typeof TrackImportIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NotImported: Story = {
	play: async ({ canvasElement }) => {
		const indicator = within(canvasElement).getByRole("button", {
			name: "Not imported into Rekordbox: Example track",
		});
		await userEvent.tab();
		await expect(indicator).toHaveFocus();
		await waitFor(() =>
			expect(within(document.body).getByRole("tooltip")).toHaveTextContent(
				"Not imported into Rekordbox",
			),
		);
	},
};
export const Ambiguous: Story = { args: { status: "ambiguous" } };
export const Unavailable: Story = { args: { status: undefined } };
export const Imported: Story = {
	args: { status: "imported" },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).queryByRole("button"),
		).not.toBeInTheDocument();
	},
};
