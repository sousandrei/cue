import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@/test/story";
import { TagBadge } from "./tag-badge";

const meta = {
	title: "Patterns/Tag badge",
	component: TagBadge,
	args: { tag: "Progressive house", onRemove: fn() },
} satisfies Meta<typeof TagBadge>;
export default meta;
export const Removable: StoryObj<typeof meta> = {
	play: async ({ canvasElement, args }) => {
		await userEvent.click(
			within(canvasElement).getByRole("button", {
				name: "Remove Progressive house tag",
			}),
		);
		await expect(args.onRemove).toHaveBeenCalledWith("Progressive house");
	},
};
export const ReadOnly: StoryObj<typeof meta> = {
	args: { onRemove: undefined },
};
