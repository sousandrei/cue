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
	fill = false,
}: {
	data?: Track[];
	loading?: boolean;
	fill?: boolean;
}) {
	return (
		<div className={fill ? "flex h-[420px] w-full flex-col p-6" : "w-full p-6"}>
			<DataTable
				fill={fill}
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
export const Scrollable: Story = {
	args: {
		fill: true,
		data: Array.from({ length: 150 }, (_, index) => ({
			id: String(index),
			title: `Track ${index + 1}`,
			artist: "Studio fixture",
		})),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const region = canvas.getByRole("region", { name: "Sample collection" });
		const header = canvas.getByRole("columnheader", { name: "Name" });
		await expect(region.scrollHeight).toBeGreaterThan(region.clientHeight);
		const headerTop = header.getBoundingClientRect().top;
		region.scrollTop = 300;
		await expect(region.scrollTop).toBe(300);
		await expect(
			Math.abs(header.getBoundingClientRect().top - headerTop),
		).toBeLessThan(2);
	},
};
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
