import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "@/test/story";
import { Switch } from "./switch";

const meta = {
	title: "UI/Switch",
	component: Switch,
	args: { "aria-label": "Automatic updates" },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
	play: async ({ canvasElement }) => {
		const control = within(canvasElement).getByRole("switch");
		await expect(control).not.toBeChecked();
		await userEvent.click(control);
		await expect(control).toBeChecked();
		await expect(control).toHaveAttribute("data-checked");
		await userEvent.keyboard(" ");
		await expect(control).not.toBeChecked();
	},
};
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = {
	args: { disabled: true, defaultChecked: true },
};
