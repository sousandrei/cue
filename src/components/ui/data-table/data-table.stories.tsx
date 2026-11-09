import type { Meta, StoryObj } from "@storybook/react";
import type { ColumnDef } from "@tanstack/react-table";
import { createColumns } from "@/components/library/columns";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Song } from "@/lib/tauri/core/types";
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
	decorators: [
		(Story) => (
			<TooltipProvider>
				<Story />
			</TooltipProvider>
		),
	],
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
export const RekordboxMetadata: Story = {
	render: () => {
		const songs: Song[] = [126.5, 90, 128.05, null].map((bpm, index) => ({
			id: String(index),
			title: `Example track ${index + 1}`,
			artist: "Studio fixture",
			filename: `${index}.mp3`,
			rekordbox: {
				song_id: String(index),
				status: bpm ? "imported" : "not_imported",
				rekordbox_id: bpm ? `rb-${index}` : null,
				bpm,
				key: bpm ? "Am" : null,
			},
		}));
		return (
			<div className="w-full p-6">
				<DataTable
					caption="Rekordbox metadata"
					columns={createColumns(
						() => {},
						() => {},
						new Set(),
					)}
					data={songs}
				/>
			</div>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getByRole("button", {
				name: "Not imported into Rekordbox: Example track 4",
			}),
		).toBeVisible();
		await expect(
			canvas.queryByRole("columnheader", { name: "Rekordbox" }),
		).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "BPM" }));
		await expect(canvas.getAllByRole("row")[1]).toHaveTextContent(
			"Example track 2",
		);
		await expect(canvas.getAllByRole("row")[2]).toHaveTextContent(
			"Example track 1",
		);
		await expect(
			within(canvas.getAllByRole("row")[4]).getByRole("button", {
				name: "Not imported into Rekordbox: Example track 4",
			}),
		).toBeVisible();
	},
};
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

export const WithoutRekordbox: Story = {
	render: () => (
		<div className="w-full p-6">
			<DataTable
				caption="Collection without Rekordbox"
				columns={createColumns(
					() => {},
					() => {},
					new Set(),
					false,
				)}
				data={[
					{
						id: "linux",
						title: "Sample track",
						artist: "Sample artist",
						filename: "sample.mp3",
						tags: "house",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.queryByRole("columnheader", { name: /BPM/ }),
		).not.toBeInTheDocument();
		await expect(
			canvas.queryByRole("columnheader", { name: /Key/ }),
		).not.toBeInTheDocument();
		await expect(
			canvas.queryByRole("button", { name: /Rekordbox/ }),
		).not.toBeInTheDocument();
		await expect(
			canvas.getByRole("button", { name: "Edit tags for Sample track" }),
		).toBeVisible();
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

export const MissingLocalFile: Story = {
	render: () => (
		<div className="w-full p-6">
			<DataTable
				caption="Collection with a missing local file"
				columns={createColumns(
					() => {},
					() => {},
					new Set(["missing"]),
					false,
					{ onLoad: () => {} },
				)}
				data={[
					{
						id: "missing",
						title: "Missing local track",
						artist: "Studio fixture",
						filename: "missing.mp3",
						tags: "house",
					},
				]}
			/>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText("Missing local track")).toBeVisible();
		await expect(
			canvas.getByRole("button", {
				name: "Load Missing local track into player",
			}),
		).toBeDisabled();
	},
};
