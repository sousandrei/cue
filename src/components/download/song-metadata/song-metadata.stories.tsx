import type { Meta, StoryObj } from "@storybook/react";
import { trackMetadata } from "@/test/fixtures";
import { SongMetadata } from "./song-metadata";

const meta = {
	title: "Music/Track metadata",
	component: SongMetadata,
	args: { metadata: trackMetadata },
	decorators: [
		(Story) => (
			<div className="w-72 max-w-[calc(100vw-2rem)]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SongMetadata>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Compact: StoryObj<typeof meta> = { args: { size: "sm" } };
export const LongTitle: StoryObj<typeof meta> = {
	args: {
		metadata: {
			...trackMetadata,
			title:
				"A very long track title with an extended mix and a featured artist",
		},
	},
};
