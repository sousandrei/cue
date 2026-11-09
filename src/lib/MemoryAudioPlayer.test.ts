import { expect, rs, test } from "@rstest/core";
import { previewAudioUrl } from "@/lib/tauri/core/previewAudio";
import { MemoryAudioPlayer } from "./MemoryAudioPlayer";

test("decodes once and seeks immediately without fetching or decoding again", async () => {
	const context = new AudioContext({ latencyHint: "interactive" });
	const player = new MemoryAudioPlayer(context);
	player.setVolume(0);
	const decode = rs.spyOn(context, "decodeAudioData");
	const fetchAudio = rs.spyOn(globalThis, "fetch");
	try {
		await player.load(previewAudioUrl(), new AbortController().signal);
		expect(player.duration).toBeCloseTo(8);
		expect(player.playing).toBe(false);
		await player.play();
		player.seek(4);
		expect(player.position).toBeGreaterThanOrEqual(4);
		expect(player.position).toBeLessThan(4.1);
		expect(player.playing).toBe(true);
		player.pause();
		player.seek(2);
		expect(player.position).toBe(2);
		expect(player.playing).toBe(false);
		expect(fetchAudio).toHaveBeenCalledTimes(1);
		expect(decode).toHaveBeenCalledTimes(1);
		player.reset();
		expect(player.duration).toBe(0);
	} finally {
		player.dispose();
		decode.mockRestore();
		fetchAudio.mockRestore();
	}
});

test("discarded loads never install a decoded buffer", async () => {
	const context = new AudioContext();
	const player = new MemoryAudioPlayer(context);
	const controller = new AbortController();
	let finish: (buffer: AudioBuffer) => void = () => {};
	const decode = rs.spyOn(context, "decodeAudioData").mockImplementation(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	try {
		const loading = player.load(previewAudioUrl(), controller.signal);
		// Wait until decoding has begun so this covers cancellation during decode.
		while (!decode.mock.calls.length)
			await new Promise((resolve) => setTimeout(resolve, 1));
		player.reset();
		controller.abort();
		finish(context.createBuffer(1, 8000, 8000));
		await loading;
		expect(player.duration).toBe(0);
	} finally {
		player.dispose();
		decode.mockRestore();
	}
});
