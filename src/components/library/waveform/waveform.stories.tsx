import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { exampleAnalysis } from "@/test/analysis";
import { Waveform } from "./waveform";

const meta = {
	title: "Library/Waveform",
	component: Waveform,
	parameters: { layout: "padded" },
	args: {
		analysis: exampleAnalysis,
		duration: 32,
		position: 8,
		onSeek: () => {},
	},
} satisfies Meta<typeof Waveform>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RGB: Story = {
	render: (args) => {
		const [position, setPosition] = useState(args.position);
		return <Waveform {...args} position={position} onSeek={setPosition} />;
	},
};
export const WithoutGrid: Story = {
	args: { analysis: { ...exampleAnalysis, beats: [] } },
};
export const GridOnly: Story = {
	args: { analysis: { ...exampleAnalysis, waveform: [] } },
};
