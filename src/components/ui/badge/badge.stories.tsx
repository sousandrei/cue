import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
	title: "UI/Badge",
	component: Badge,
	args: { children: "Ready" },
} satisfies Meta<typeof Badge>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Statuses: StoryObj<typeof meta> = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Badge>Selected</Badge>
			<Badge variant="accent-cool">Complete</Badge>
			<Badge variant="accent-warm">Queued</Badge>
			<Badge variant="destructive">Failed</Badge>
			<Badge variant="outline">124 BPM</Badge>
		</div>
	),
};
