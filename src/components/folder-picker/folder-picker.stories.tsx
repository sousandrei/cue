import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MockTauriService } from "@/lib/tauri/core/MockTauriService";
import { TauriProvider } from "@/lib/tauri/TauriProvider";
import { expect, userEvent, within } from "@/test/story";
import { FolderPicker } from "./folder-picker";

class FixtureService extends MockTauriService {
	override async open() {
		return "/studio/library";
	}
}
const service = new FixtureService();
function Example() {
	const [path, setPath] = useState("");
	return (
		<TauriProvider service={service}>
			<div className="w-80 max-w-[calc(100vw-2rem)]">
				<FolderPicker
					id="fixture-library"
					label="Music library"
					value={path}
					onChange={setPath}
				/>
			</div>
		</TauriProvider>
	);
}
const meta = {
	title: "Patterns/Folder picker",
	component: Example,
} satisfies Meta<typeof Example>;
export default meta;
export const ChooseFolder: StoryObj<typeof meta> = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(
			canvas.getByRole("button", { name: "Choose library folder" }),
		);
		await expect(
			canvas.getByRole("textbox", { name: "Music library" }),
		).toHaveValue("/studio/library");
	},
};
