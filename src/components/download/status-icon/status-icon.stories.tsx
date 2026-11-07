import type { Meta, StoryObj } from "@storybook/react";
import { StatusIcon } from "./status-icon";

const meta = {
	title: "Music/Status icon",
	component: StatusIcon,
	args: { status: "completed" },
	render: (args) => (
		<div className="flex items-center gap-3">
			<StatusIcon {...args} />
			<span className="text-sm capitalize">{args.status}</span>
		</div>
	),
} satisfies Meta<typeof StatusIcon>;
export default meta;
export const Complete: StoryObj<typeof meta> = {};
export const Failed: StoryObj<typeof meta> = { args: { status: "error" } };
export const Downloading: StoryObj<typeof meta> = {
	args: { status: "downloading" },
};
export const Queued: StoryObj<typeof meta> = { args: { status: "queued" } };
