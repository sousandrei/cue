import type { Meta, StoryObj } from "@storybook/react";
import { MockTauriService } from "@/lib/tauri/core/MockTauriService";
import { TauriProvider } from "@/lib/tauri/TauriProvider";
import { expect, fn, userEvent, waitFor, within } from "@/test/story";
import { AboutDialog } from "./about-dialog";

const openUrl = fn(async (_url: string) => {});
const service = new MockTauriService();
service.openUrl = openUrl;

const meta = {
	title: "Settings/About & licenses",
	component: AboutDialog,
	decorators: [
		(Story) => (
			<TauriProvider service={service}>
				<Story />
			</TauriProvider>
		),
	],
	beforeEach: () => {
		openUrl.mockReset();
	},
} satisfies Meta<typeof AboutDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

async function openDialog(canvasElement: HTMLElement) {
	await userEvent.click(
		within(canvasElement).getByRole("button", { name: "About & licenses" }),
	);
	const dialog = await within(document.body).findByRole("dialog", {
		name: "About Cue",
	});
	await waitFor(() => expect(dialog).toBeVisible());
	return within(dialog);
}

export const Licenses: Story = {
	play: async ({ canvasElement }) => {
		const dialog = await openDialog(canvasElement);
		await expect(
			dialog.getByRole("link", { name: "GNU GPL v3" }),
		).toHaveAttribute("href", "https://www.gnu.org/licenses/gpl-3.0.html");
		await expect(dialog.getByText(/without any warranty/)).toBeVisible();
		await expect(dialog.getByText(/Source code \(zip\)/)).toBeVisible();
		const source = dialog.getByRole("link", {
			name: "Releases & source downloads",
		});
		await expect(source).toHaveAttribute(
			"href",
			"https://github.com/sousandrei/cue/releases",
		);
		await userEvent.click(source);
		await expect(openUrl).toHaveBeenCalledWith(
			"https://github.com/sousandrei/cue/releases",
		);
	},
};

export const KeyboardDismissal: Story = {
	play: async ({ canvasElement }) => {
		await openDialog(canvasElement);
		await userEvent.keyboard("{Escape}");
		await waitFor(() =>
			expect(
				within(document.body).queryByRole("dialog"),
			).not.toBeInTheDocument(),
		);
		await expect(
			within(canvasElement).getByRole("button", { name: "About & licenses" }),
		).toHaveFocus();
	},
};

export const BrowserUnavailable: Story = {
	play: async ({ canvasElement }) => {
		openUrl.mockRejectedValueOnce(new Error("Browser unavailable"));
		const dialog = await openDialog(canvasElement);
		await userEvent.click(
			dialog.getByRole("link", { name: "View repository" }),
		);
		await expect(await dialog.findByRole("alert")).toHaveTextContent(
			"Could not open your browser. Visit https://github.com/sousandrei/cue",
		);
	},
};
