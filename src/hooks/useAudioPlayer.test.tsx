import { afterEach, expect, rs, test } from "@rstest/core";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { MemoryAudioPlayer } from "@/lib/MemoryAudioPlayer";
import { MockTauriService } from "@/lib/tauri/core/MockTauriService";
import type { Song } from "@/lib/tauri/core/types";
import { TauriProvider } from "@/lib/tauri/TauriProvider";
import { AudioPlayerProvider, useAudioPlayer } from "./useAudioPlayer";

const first: Song = {
	id: "first",
	title: "First",
	artist: "Artist",
	filename: "first.mp3",
};
const second = { ...first, id: "second", title: "Second" };
function Harness() {
	const player = useAudioPlayer();
	return (
		<>
			<button type="button" onClick={() => void player.loadSong(first)}>
				First
			</button>
			<button type="button" onClick={() => void player.loadSong(second)}>
				Second
			</button>
			<button type="button" onClick={player.toggle}>
				Toggle
			</button>
			<button type="button" onClick={player.stop}>
				Stop
			</button>
			<button type="button" onClick={() => player.seek(40)}>
				Seek
			</button>
			<input aria-label="Search" />
			<div data-waveform="">
				<input type="range" aria-label="Focused waveform" />
			</div>
			<output data-testid="state">
				{JSON.stringify({
					song: player.song?.id,
					loading: player.loading,
					error: player.error,
					position: player.position,
					playing: player.playing,
				})}
			</output>
		</>
	);
}
function setup(service = new MockTauriService()) {
	let position = 0;
	let playing = false;
	rs.spyOn(MemoryAudioPlayer.prototype, "duration", "get").mockReturnValue(30);
	rs.spyOn(MemoryAudioPlayer.prototype, "position", "get").mockImplementation(
		() => position,
	);
	rs.spyOn(MemoryAudioPlayer.prototype, "playing", "get").mockImplementation(
		() => playing,
	);
	const load = rs
		.spyOn(MemoryAudioPlayer.prototype, "load")
		.mockResolvedValue(undefined);
	const play = rs
		.spyOn(MemoryAudioPlayer.prototype, "play")
		.mockImplementation(async () => {
			playing = true;
		});
	rs.spyOn(MemoryAudioPlayer.prototype, "pause").mockImplementation(() => {
		playing = false;
	});
	const reset = rs
		.spyOn(MemoryAudioPlayer.prototype, "reset")
		.mockImplementation(() => {
			playing = false;
			position = 0;
		});
	rs.spyOn(MemoryAudioPlayer.prototype, "seek").mockImplementation((value) => {
		position = Math.max(0, Math.min(30, value));
	});
	render(
		<TauriProvider service={service}>
			<AudioPlayerProvider>
				<Harness />
			</AudioPlayerProvider>
		</TauriProvider>,
	);
	return { load, play, reset, position: () => position };
}
afterEach(() => {
	rs.restoreAllMocks();
});

test("loads paused and starts only from an explicit play action", async () => {
	const service = new MockTauriService();
	rs.spyOn(service, "getSongAudioUrl").mockResolvedValue("first.mp3");
	const { load, play } = setup(service);
	fireEvent.click(screen.getByText("First"));
	await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
	expect(play).not.toHaveBeenCalled();
	fireEvent.click(screen.getByText("Toggle"));
	await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByText("Second"));
	await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
	expect(play).toHaveBeenCalledTimes(1);
});
test("ignores out-of-order track URL requests", async () => {
	const service = new MockTauriService();
	const pending = new Map<string, (url: string) => void>();
	rs.spyOn(service, "getSongAudioUrl").mockImplementation(
		(id) => new Promise((resolve) => pending.set(id, resolve)),
	);
	const { load } = setup(service);
	fireEvent.click(screen.getByText("First"));
	fireEvent.click(screen.getByText("Second"));
	await act(async () => pending.get("second")?.("second.mp3"));
	await act(async () => pending.get("first")?.("first.mp3"));
	expect(load).toHaveBeenCalledTimes(1);
	expect(load.mock.calls[0][0]).toBe("second.mp3");
});
test("stopping cancels a pending load", async () => {
	const service = new MockTauriService();
	let resolveUrl: (url: string) => void = () => {};
	rs.spyOn(service, "getSongAudioUrl").mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveUrl = resolve;
			}),
	);
	const { load } = setup(service);
	fireEvent.click(screen.getByText("First"));
	fireEvent.click(screen.getByText("Stop"));
	await act(async () => resolveUrl("first.mp3"));
	expect(load).not.toHaveBeenCalled();
});
test("retries missing files", async () => {
	const service = new MockTauriService();
	const resolve = rs
		.spyOn(service, "getSongAudioUrl")
		.mockRejectedValueOnce("File missing")
		.mockResolvedValue("first.mp3");
	setup(service);
	fireEvent.click(screen.getByText("First"));
	await waitFor(() =>
		expect(screen.getByTestId("state").textContent).toContain("File missing"),
	);
	fireEvent.click(screen.getByText("Toggle"));
	await waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
});
test("clears the active track when it is removed", async () => {
	const service = new MockTauriService();
	rs.spyOn(service, "getSongAudioUrl")
		.mockResolvedValueOnce("first.mp3")
		.mockRejectedValue("Song not found");
	const { load } = setup(service);
	fireEvent.click(screen.getByText("First"));
	await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
	await act(async () => {
		await service.removeSong(first.id);
	});
	await waitFor(() =>
		expect(screen.getByTestId("state").textContent).not.toContain(
			'"song":"first"',
		),
	);
});
test("clamps seeks and leaves typing shortcuts alone", async () => {
	const service = new MockTauriService();
	rs.spyOn(service, "getSongAudioUrl").mockResolvedValue("first.mp3");
	const player = setup(service);
	fireEvent.click(screen.getByText("First"));
	await waitFor(() => expect(player.load).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByText("Seek"));
	expect(player.position()).toBe(30);
	fireEvent.keyDown(screen.getByRole("textbox"), { code: "ArrowLeft" });
	expect(player.position()).toBe(30);
	fireEvent.keyDown(document.body, { code: "ArrowLeft" });
	expect(player.position()).toBe(29);
});

test("Space and arrow shortcuts remain active while a waveform control has focus", async () => {
	const service = new MockTauriService();
	rs.spyOn(service, "getSongAudioUrl").mockResolvedValue("first.mp3");
	const player = setup(service);
	fireEvent.click(screen.getByText("First"));
	await waitFor(() => expect(player.load).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByText("Seek"));
	const waveform = screen.getByRole("slider", { name: "Focused waveform" });
	waveform.focus();
	fireEvent.keyDown(waveform, { code: "Space", key: " " });
	await waitFor(() => expect(player.play).toHaveBeenCalledTimes(1));
	fireEvent.keyDown(waveform, { code: "ArrowLeft", key: "ArrowLeft" });
	expect(player.position()).toBe(29);
});
