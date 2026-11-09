import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { exampleAnalysis } from "@/test/analysis";
import { Player } from "./player";

const meta = {
	title: "Library/Player",
	component: Player,
	parameters: { layout: "padded" },
	args: {
		song: {
			id: "preview",
			title: "Midnight Signal",
			artist: "Studio fixture",
			filename: "preview.mp3",
		},
		playing: false,
		loading: false,
		position: 84,
		duration: 392,
		volume: 0.8,
		error: null,
		onToggle: () => {},
		onSeek: () => {},
		onVolumeChange: () => {},
		onClose: () => {},
	},
} satisfies Meta<typeof Player>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {
	render: (args) => {
		const [playing, setPlaying] = useState(false);
		const [position, setPosition] = useState(args.position);
		const [volume, setVolume] = useState(args.volume);
		return (
			<Player
				{...args}
				playing={playing}
				position={position}
				volume={volume}
				onToggle={() => setPlaying(!playing)}
				onSeek={setPosition}
				onVolumeChange={setVolume}
			/>
		);
	},
};
export const Empty: Story = { args: { song: null, position: 0, duration: 0 } };
export const Playing: Story = { args: { playing: true } };
export const Loading: Story = {
	args: { loading: true, position: 0, duration: 0 },
};
export const Unavailable: Story = {
	args: {
		error: "This track is missing locally. Use Sync to download it again.",
		duration: 0,
		position: 0,
	},
};
export const WithWaveform: Story = {
	args: {
		analysis: exampleAnalysis,
		analysisStatus: "ready",
		duration: 32,
		position: 8,
	},
};
export const AnalysisUnavailable: Story = {
	args: { analysis: null, analysisStatus: "unavailable" },
};
