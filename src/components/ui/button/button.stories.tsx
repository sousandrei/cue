import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@/test/story";
import { Button } from "./button";

const meta = {
	title: "UI/Button",
	component: Button,
	args: { children: "Add to queue", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	play: async ({ canvasElement, args }) => {
		const button = within(canvasElement).getByRole("button", {
			name: "Add to queue",
		});
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvasElement, args }) => {
		const button = within(canvasElement).getByRole("button");
		await expect(button).toBeDisabled();
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};

export const Variants: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-3 p-6">
			<Button>Primary</Button>
			<Button variant="outline">Secondary</Button>
			<Button variant="ghost">Quiet</Button>
			<Button variant="destructive">Remove track</Button>
		</div>
	),
};

export const DestructiveSurfaces: Story = {
	render: () => (
		<div className="space-y-4 p-6">
			<div className="rounded-xl bg-card p-6">
				<Button variant="destructive">Remove from card</Button>
			</div>
			<div className="rounded-2xl bg-surface-raised p-6">
				<Button variant="destructive">Remove from dialog</Button>
			</div>
		</div>
	),
};
