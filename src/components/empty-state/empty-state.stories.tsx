import type { Meta, StoryObj } from "@storybook/react";
import { Music } from "lucide-react";
import { EmptyState } from "./empty-state";

const meta = {
	title: "Layout/Empty state",
	component: EmptyState,
	args: {
		icon: Music,
		title: "Your library is empty",
		description: "Synced songs will appear here.",
	},
	decorators: [
		(Story) => (
			<div className="w-full max-w-xl p-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof EmptyState>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
