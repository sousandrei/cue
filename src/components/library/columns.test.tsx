import { expect, rs, test } from "@rstest/core";
import { fireEvent, render, within } from "@testing-library/react";
import { DataTable } from "@/components/ui/data-table";
import type { Song } from "@/lib/tauri/core/types";
import { createColumns } from "./columns";

test("pointer loading releases row-button focus while keyboard loading retains it", () => {
	const song: Song = {
		id: "song",
		title: "Track",
		artist: "Artist",
		filename: "track.mp3",
	};
	const load = rs.fn();
	const columns = createColumns(rs.fn(), rs.fn(), new Set(), false, {
		onLoad: load,
	});
	const { container } = render(
		<DataTable
			columns={columns}
			data={[song]}
			getRowId={(track) => track.id}
		/>,
	);
	const button = within(container).getByRole("button", {
		name: "Load Track into player",
	});
	button.focus();
	fireEvent.click(button, { detail: 1 });
	expect(document.activeElement).not.toBe(button);
	expect(load).toHaveBeenCalledTimes(1);
	button.focus();
	fireEvent.click(button, { detail: 0 });
	expect(document.activeElement).toBe(button);
});
