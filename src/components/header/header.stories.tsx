import type { Meta, StoryObj } from "@storybook/react";
import { AboutDialog } from "@/components/about-dialog";
import { TauriProvider } from "@/lib/tauri/TauriProvider";
import { expect, userEvent, waitFor, within } from "@/test/story";
import { Header } from "./header";

const meta = { title: "Layout/Header", component: Header } satisfies Meta<
	typeof Header
>;
export default meta;
export const Intake: StoryObj<typeof meta> = {};
export const Collection: StoryObj<typeof meta> = {
	args: {
		title: "Collection",
		subtitle: "Your tracks, ready for the next set.",
	},
};

export const Options: StoryObj<typeof meta> = {
	args: {
		title: "Options",
		subtitle: "Make Cue feel at home in your workflow.",
		action: <AboutDialog />,
	},
	decorators: [
		(Story) => (
			<TauriProvider>
				<div className="w-full max-w-2xl">
					<Story />
				</div>
			</TauriProvider>
		),
	],
	play: async ({ canvasElement }) => {
		const header = within(canvasElement).getByRole("banner");
		const about = within(header).getByRole("button", {
			name: "About & licenses",
		});
		await expect(about).toBeVisible();
		await userEvent.click(about);
		const dialog = await within(document.body).findByRole("dialog", {
			name: "About Cue",
		});
		await waitFor(() => expect(dialog).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(about).toHaveFocus());
	},
};
