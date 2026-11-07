import type { Meta, StoryObj } from "@storybook/react";
import { FolderOpen } from "lucide-react";
import { expect, userEvent, within } from "@/test/story";
import { Button } from "../button";
import { Tooltip, TooltipProvider } from "./tooltip";

function Example() {
	return (
		<TooltipProvider delay={0}>
			<Tooltip content="Choose your library folder">
				<Button size="icon" variant="outline" aria-label="Choose folder">
					<FolderOpen />
				</Button>
			</Tooltip>
		</TooltipProvider>
	);
}
const meta = { title: "UI/Tooltip", component: Example } satisfies Meta<
	typeof Example
>;
export default meta;
export const Default: StoryObj<typeof meta> = {
	play: async ({ canvasElement }) => {
		await userEvent.hover(
			within(canvasElement).getByRole("button", { name: "Choose folder" }),
		);
		await expect(
			await within(document.body).findByRole("tooltip"),
		).toHaveTextContent("Choose your library folder");
	},
};
