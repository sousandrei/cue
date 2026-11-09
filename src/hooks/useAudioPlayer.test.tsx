import { afterEach, describe, expect, rs, test } from "@rstest/core";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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
const second: Song = { ...first, id: "second", title: "Second" };

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
			<output data-testid="state">
				{JSON.stringify({
					song: player.song?.id,
					error: player.error,
					loading: player.loading,
					position: player.position,
				})}
			</output>
		</>
	);
}
function setup(service = new MockTauriService()) {
	const play = rs
		.spyOn(HTMLMediaElement.prototype, "play")
		.mockResolvedValue(undefined);
	rs.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
	rs.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
	const result = render(
		<TauriProvider service={service}>
			<AudioPlayerProvider>
				<Harness />
			</AudioPlayerProvider>
		</TauriProvider>,
	);
	const audio = result.container.querySelector("audio");
	if (!audio) throw new Error("Audio element missing");
	return { ...result, audio, play, service };
}
afterEach(() => {
	rs.restoreAllMocks();
});

describe("shared audio player", () => {
	test("only loads the latest track when URL requests resolve out of order", async () => {
		const service = new MockTauriService();
		let resolveFirst: (url: string) => void = () => {};
		let resolveSecond: (url: string) => void = () => {};
		rs.spyOn(service, "getSongAudioUrl").mockImplementation(
			(id) =>
				new Promise<string>((resolve) => {
					if (id === "first") resolveFirst = resolve;
					else resolveSecond = resolve;
				}),
		);
		const { audio, play } = setup(service);
		fireEvent.click(screen.getByText("First"));
		fireEvent.click(screen.getByText("Second"));
		await act(async () => resolveSecond("https://example.com/second.mp3"));
		await act(async () => resolveFirst("https://example.com/first.mp3"));
		expect(audio.src).toBe("https://example.com/second.mp3");
		expect(play).not.toHaveBeenCalled();
		expect(screen.getByTestId("state").textContent).toContain(
			'"song":"second"',
		);
	});

	test("loads paused and starts only when the player is toggled", async () => {
		const service = new MockTauriService();
		rs.spyOn(service, "getSongAudioUrl").mockImplementation(
			async (id) => `https://example.com/${id}.mp3`,
		);
		const { audio, play } = setup(service);
		fireEvent.click(screen.getByText("First"));
		await waitFor(() =>
			expect(audio.src).toBe("https://example.com/first.mp3"),
		);
		expect(audio.paused).toBe(true);
		expect(play).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("Toggle"));
		expect(play).toHaveBeenCalledTimes(1);
		fireEvent.playing(audio);
		fireEvent.click(screen.getByText("Second"));
		await waitFor(() =>
			expect(audio.src).toBe("https://example.com/second.mp3"),
		);
		expect(play).toHaveBeenCalledTimes(1);
		expect(audio.paused).toBe(true);
	});

	test("stopping cancels a pending load", async () => {
		const service = new MockTauriService();
		let resolveUrl: (url: string) => void = () => {};
		rs.spyOn(service, "getSongAudioUrl").mockImplementation(
			() =>
				new Promise<string>((resolve) => {
					resolveUrl = resolve;
				}),
		);
		const { audio, play } = setup(service);
		fireEvent.click(screen.getByText("First"));
		fireEvent.click(screen.getByText("Stop"));
		await act(async () => resolveUrl("https://example.com/first.mp3"));
		expect(audio.hasAttribute("src")).toBe(false);
		expect(play).not.toHaveBeenCalled();
	});

	test("reports missing files and retries them", async () => {
		const service = new MockTauriService();
		const resolve = rs
			.spyOn(service, "getSongAudioUrl")
			.mockRejectedValueOnce("File missing")
			.mockResolvedValue("https://example.com/first.mp3");
		setup(service);
		fireEvent.click(screen.getByText("First"));
		await waitFor(() =>
			expect(screen.getByTestId("state").textContent).toContain("File missing"),
		);
		fireEvent.click(screen.getByText("Toggle"));
		await waitFor(() => expect(resolve).toHaveBeenCalledTimes(2));
	});

	test("clears playback when the active track is removed from the library", async () => {
		const service = new MockTauriService();
		rs.spyOn(service, "getSongAudioUrl")
			.mockResolvedValueOnce("https://example.com/first.mp3")
			.mockRejectedValue("Song not found");
		const { audio } = setup(service);
		fireEvent.click(screen.getByText("First"));
		await waitFor(() =>
			expect(audio.getAttribute("src")).toBe("https://example.com/first.mp3"),
		);
		await act(async () => {
			await service.removeSong(first.id);
		});
		await waitFor(() => expect(audio.hasAttribute("src")).toBe(false));
		expect(screen.getByTestId("state").textContent).not.toContain(
			'"song":"first"',
		);
	});

	test("clamps seeking and leaves typing shortcuts alone", async () => {
		const service = new MockTauriService();
		rs.spyOn(service, "getSongAudioUrl").mockResolvedValue(
			"https://example.com/first.mp3",
		);
		const { audio, play } = setup(service);
		fireEvent.click(screen.getByText("First"));
		await waitFor(() =>
			expect(audio.getAttribute("src")).toBe("https://example.com/first.mp3"),
		);
		Object.defineProperty(audio, "duration", { configurable: true, value: 30 });
		fireEvent.click(screen.getByText("Seek"));
		expect(audio.currentTime).toBe(30);
		fireEvent.keyDown(screen.getByRole("textbox"), { code: "ArrowLeft" });
		expect(audio.currentTime).toBe(30);
		fireEvent.keyDown(document.body, { code: "ArrowLeft" });
		expect(audio.currentTime).toBe(25);
		fireEvent.keyDown(screen.getByRole("textbox"), { code: "Space" });
		expect(play).not.toHaveBeenCalled();
	});
});
