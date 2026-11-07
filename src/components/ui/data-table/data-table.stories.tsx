import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { expect, userEvent, within } from "@/test/story";
import { DataTable, type dataTableFeatures } from "./data-table";

interface Track {
	id: string;
	title: string;
	artist: string;
}
const tracks: Track[] = [
	{ id: "z", title: "Zulu Signal", artist: "Studio fixture" },
	{ id: "a", title: "After Hours", artist: "Studio fixture" },
	{ id: "m", title: "Midnight Radio", artist: "Studio fixture" },
];
const columns: ColumnDef<typeof dataTableFeatures, Track>[] = [
	{ accessorKey: "title", header: "Name", size: 320 },
	{ accessorKey: "artist", header: "Artist", size: 240 },
];
function Example({
	data = tracks,
	loading = false,
}: {
	data?: Track[];
	loading?: boolean;
}) {
	return (
		<div className="w-full p-6">
			<DataTable
				caption="Sample collection"
				columns={columns}
				data={data}
				loading={loading}
				getRowId={(track) => track.id}
			/>
		</div>
	);
}
const meta = {
	title: "Patterns/Data table",
	component: Example,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sortable: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Name" }));
		await expect(canvas.getAllByRole("row")[1]).toHaveTextContent(
			"After Hours",
		);
		await expect(
			canvas.getByRole("columnheader", { name: "Name" }),
		).toHaveAttribute("aria-sort", "ascending");
		await userEvent.click(canvas.getByRole("button", { name: "Name" }));
		await expect(canvas.getAllByRole("row")[1]).toHaveTextContent(
			"Zulu Signal",
		);
	},
};
export const Empty: Story = {
	args: { data: [] },
	play: async ({ canvasElement }) => {
		await expect(
			within(canvasElement).getByText("No results found."),
		).toBeVisible();
	},
};
export const Loading: Story = { args: { loading: true } };
export const LongNames: Story = {
	args: {
		data: [
			{
				id: "long",
				title:
					"A very long track title with an extended mix and a featured artist",
				artist: "An artist with a wonderfully long name",
			},
		],
	},
};
