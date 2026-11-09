import { expect, rs, test } from "@rstest/core";
import { fireEvent, render, within } from "@testing-library/react";
import { testStories } from "@/test/stories";
import { Player } from "./player";
import * as stories from "./player.stories";

const base = {
	song: { id: "song", title: "Track", artist: "Artist", filename: "track.mp3" },
	playing: false,
	loading: false,
	position: 8,
	duration: 32,
	volume: 0.8,
	error: null,
	onToggle: () => {},
	onSeek: () => {},
	onVolumeChange: () => {},
	onClose: () => {},
};

test("focused fallback seek controls use the shortcut without a native slider step", () => {
	const skip = rs.fn();
	const seek = rs.fn();
	const { container } = render(
		<Player {...base} analysis={null} onSkipBar={skip} onSeek={seek} />,
	);
	fireEvent.keyDown(
		within(container).getByRole("slider", { name: "Playback position" }),
		{ key: "ArrowRight", code: "ArrowRight" },
	);
	expect(skip).toHaveBeenCalledTimes(1);
	expect(skip.mock.calls[0][0]).toBe(1);
	fireEvent.keyDown(
		within(container).getByRole("slider", { name: "Playback position" }),
		{ key: "ArrowLeft", code: "ArrowLeft" },
	);
	expect(skip).toHaveBeenCalledTimes(2);
	expect(skip.mock.calls[1][0]).toBe(-1);
	expect(seek).not.toHaveBeenCalled();
});

testStories(stories);
