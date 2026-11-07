import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "@/test/story";
import { DownloadInput } from "./download-input";

function Example(
	props: Omit<React.ComponentProps<typeof DownloadInput>, "setUrl">,
) {
	const [url, setUrl] = useState(props.url);
	return (
		<div className="w-full max-w-2xl p-6">
			<DownloadInput {...props} url={url} setUrl={setUrl} />
		</div>
	);
}
const meta = {
	title: "Patterns/Download input",
	component: Example,
	args: { url: "", loading: false, onAdd: fn(), onUpload: fn() },
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await expect(
			canvas.getByRole("button", { name: "Add to queue" }),
		).toBeDisabled();
		await userEvent.click(canvas.getByRole("textbox"));
		await userEvent.keyboard("{Enter}");
		await expect(args.onAdd).not.toHaveBeenCalled();
	},
};
export const AddsOnEnter: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		await userEvent.type(
			canvas.getByRole("textbox", { name: "Track or playlist link" }),
			"https://soundcloud.com/example/track{Enter}",
		);
		await expect(args.onAdd).toHaveBeenCalledOnce();
		await userEvent.click(canvas.getByRole("button", { name: "Import links" }));
		await expect(args.onUpload).toHaveBeenCalledOnce();
	},
};
export const Busy: Story = {
	args: { loading: true, url: "https://soundcloud.com/example/track" },
	play: async ({ canvasElement }) => {
		await expect(within(canvasElement).getByRole("textbox")).toBeDisabled();
	},
};
