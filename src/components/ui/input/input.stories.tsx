import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "@/test/story";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import { Input } from "./input";

const meta = {
	title: "UI/Input",
	component: Input,
	args: { "aria-label": "Track URL", placeholder: "Paste a track link" },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const input = within(canvasElement).getByRole("textbox", {
			name: "Track URL",
		});
		await userEvent.type(input, "https://soundcloud.com/example/track");
		await expect(input).toHaveValue("https://soundcloud.com/example/track");
	},
};
export const Disabled: Story = {
	args: { disabled: true, value: "Your library is being prepared" },
};
export const Invalid: Story = {
	render: () => (
		<Field invalid className="w-80">
			<FieldLabel>Track link</FieldLabel>
			<Input defaultValue="not a link" />
			<FieldDescription>Use a YouTube or SoundCloud URL.</FieldDescription>
			<FieldError match>
				Enter a complete link beginning with https://.
			</FieldError>
		</Field>
	),
};
