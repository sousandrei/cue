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

test("visual position advances at frame time even when the audio clock advances in blocks", async () => {
	const context = new AudioContext({ latencyHint: "interactive" });
	const player = new MemoryAudioPlayer(context);
	player.setVolume(0);
	const time = rs.spyOn(context, "currentTime", "get").mockReturnValue(10);
	const timestamp = rs
		.spyOn(context, "getOutputTimestamp")
		.mockReturnValue({ contextTime: 10, performanceTime: 1000 });
	try {
		await player.load(previewAudioUrl(), new AbortController().signal);
		await player.play();
		player.seek(2);
		expect(player.position).toBe(2);
		expect(player.getVisualPosition(1000)).toBe(2);
		expect(player.getVisualPosition(1000 + 1000 / 60)).toBeCloseTo(
			2 + 1 / 60,
			6,
		);
		// An audio block arriving early must not make the next display frame jump.
		time.mockReturnValue(10.04);
		expect(player.position).toBeCloseTo(2.04);
		expect(player.getVisualPosition(1000 + 2000 / 60)).toBeCloseTo(
			2 + 2 / 60,
			6,
		);
		player.pause();
		expect(player.getVisualPosition(2000)).toBeCloseTo(2.04);
		player.seek(4);
		expect(player.getVisualPosition(2000)).toBe(4);
	} finally {
		player.dispose();
		time.mockRestore();
		timestamp.mockRestore();
	}
});

test("visual position falls back to the transport clock before output timestamps are available", async () => {
	const context = new AudioContext();
	const player = new MemoryAudioPlayer(context);
	player.setVolume(0);
	const time = rs.spyOn(context, "currentTime", "get").mockReturnValue(10);
	const timestamp = rs
		.spyOn(context, "getOutputTimestamp")
		.mockReturnValue({ contextTime: 0, performanceTime: 0 });
	try {
		await player.load(previewAudioUrl(), new AbortController().signal);
		await player.play();
		player.seek(3);
		expect(player.getVisualPosition(2000)).toBe(3);
		timestamp.mockReturnValue({ contextTime: 10, performanceTime: 1000 });
		expect(player.getVisualPosition(500)).toBe(3);
		expect(player.getVisualPosition(20000)).toBe(8);
		Object.defineProperty(context, "getOutputTimestamp", {
			value: undefined,
			configurable: true,
		});
		expect(player.getVisualPosition(2000)).toBe(3);
	} finally {
		player.dispose();
		time.mockRestore();
		timestamp.mockRestore();
	}
});

test("visual movement filters timestamp jitter without losing audio-clock drift", async () => {
	const context = new AudioContext();
	const player = new MemoryAudioPlayer(context);
	player.setVolume(0);
	const time = rs.spyOn(context, "currentTime", "get").mockReturnValue(10);
	const timestamp = rs
		.spyOn(context, "getOutputTimestamp")
		.mockReturnValue({ contextTime: 10, performanceTime: 1000 });
	try {
		await player.load(previewAudioUrl(), new AbortController().signal);
		await player.play();
		player.seek(1);
		let previous = player.getVisualPosition(1000);
		let position = previous;
		for (let frame = 1; frame <= 240; frame++) {
			const elapsed = frame / 60;
			const jitter = (frame % 2 ? 1 : -1) * 0.003;
			timestamp.mockReturnValue({
				contextTime: 10 + elapsed * 1.001 + jitter,
				performanceTime: 1000 + elapsed * 1000,
			});
			position = player.getVisualPosition(1000 + elapsed * 1000);
			expect(Math.abs(position - previous - 1 / 60)).toBeLessThan(0.00025);
			previous = position;
		}
		// Even a deliberately fast audio clock stays within 2ms after four seconds.
		expect(Math.abs(position - (1 + 4 * 1.001))).toBeLessThan(0.002);
		time.mockReturnValue(14.004);
		player.seek(3);
		timestamp.mockReturnValue({ contextTime: 14.004, performanceTime: 5000 });
		expect(player.getVisualPosition(5000)).toBe(3);
	} finally {
		player.dispose();
		time.mockRestore();
		timestamp.mockRestore();
	}
});
