import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { expect, fn, userEvent, within } from "@/test/story";
import { TagInput } from "./tag-input";

function Example({
	onBlur,
	initialTags = ["house"],
}: {
	onBlur: () => void;
	initialTags?: string[];
}) {
	const [tags, setTags] = useState(initialTags);
	return (
		<div className="w-80 max-w-[calc(100vw-2rem)] space-y-4">
			<TagInput tags={tags} onChange={setTags} onBlur={onBlur} />
			<Button variant="outline">Done editing</Button>
			<p className="text-xs text-muted-foreground" role="status">
				{tags.length} tags
			</p>
		</div>
	);
}
const meta = {
	title: "Patterns/Tag input",
	component: Example,
	args: { onBlur: fn() },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const KeyboardEditing: Story = {
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByRole("textbox", { name: "Add tag" });
		await userEvent.type(input, "techno{Enter}");
		await expect(canvas.getByText("2 tags")).toBeVisible();
		await userEvent.type(input, "techno{Enter}");
		await expect(canvas.getByText("2 tags")).toBeVisible();
		await userEvent.keyboard("{Backspace}{Backspace}");
		await expect(canvas.getByText("1 tags")).toBeVisible();
		await userEvent.click(
			canvas.getByRole("button", { name: "Remove house tag" }),
		);
		await expect(canvas.getByText("0 tags")).toBeVisible();
		await expect(input).toHaveFocus();
		await userEvent.click(canvas.getByRole("button", { name: "Done editing" }));
		await expect(args.onBlur).toHaveBeenCalledOnce();
	},
};
export const LongTags: Story = {
	args: {
		initialTags: [
			"Progressive house",
			"A very long tag that should stay inside the field",
		],
	},
};
