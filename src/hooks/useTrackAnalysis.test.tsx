import { expect, rs, test } from "@rstest/core";
import {
	act,
	fireEvent,
	render,
	renderHook,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Player } from "@/components/library/player/player";
import { MockTauriService } from "@/lib/tauri/core/MockTauriService";
import type { RekordboxStatus, TrackAnalysis } from "@/lib/tauri/core/types";
import { TauriProvider } from "@/lib/tauri/TauriProvider";
import { exampleAnalysis } from "@/test/analysis";
import { useTrackAnalysis } from "./useTrackAnalysis";

test("ignores stale analysis when tracks change or the player closes", async () => {
	const service = new MockTauriService();
	const pending = new Map<string, (analysis: TrackAnalysis | null) => void>();
	rs.spyOn(service, "getSongAnalysis").mockImplementation(
		(id) => new Promise((resolve) => pending.set(id, resolve)),
	);
	const { result, rerender } = renderHook(
		({ id }: { id: string | undefined }) => useTrackAnalysis(id),
		{
			initialProps: { id: "first" as string | undefined },
			wrapper: ({ children }: { children: ReactNode }) => (
				<TauriProvider service={service}>{children}</TauriProvider>
			),
		},
	);
	rerender({ id: "second" });
	await act(async () => pending.get("second")?.(exampleAnalysis));
	await waitFor(() => expect(result.current.status).toBe("ready"));
	await act(async () => pending.get("first")?.(null));
	expect(result.current.analysis).toEqual(exampleAnalysis);
	rerender({ id: undefined });
	expect(result.current.status).toBe("idle");
	expect(result.current.analysis).toBeNull();
});

test("reports missing analysis without failing playback", async () => {
	const service = new MockTauriService();
	const { result } = renderHook(() => useTrackAnalysis("missing"), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<TauriProvider service={service}>{children}</TauriProvider>
		),
	});
	await waitFor(() => expect(result.current.status).toBe("unavailable"));
});

test("keeps the last waveform after a transient same-track refresh error", async () => {
	const service = new MockTauriService();
	const getAnalysis = rs
		.spyOn(service, "getSongAnalysis")
		.mockResolvedValueOnce(exampleAnalysis)
		.mockRejectedValueOnce(new Error("Analysis is being saved"));
	const { result } = renderHook(() => useTrackAnalysis("song"), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<TauriProvider service={service}>{children}</TauriProvider>
		),
	});
	await waitFor(() => expect(result.current.status).toBe("ready"));
	const status = await service.getRekordboxStatus();
	await act(async () => {
		(
			service as unknown as {
				emit: (event: string, payload: typeof status) => void;
			}
		).emit("rekordbox://updated", status);
	});
	await waitFor(() => expect(getAnalysis).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(result.current.status).toBe("error"));
	expect(result.current.analysis).toEqual(exampleAnalysis);
});

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

function Harness() {
	const analysis = useTrackAnalysis("song");
	return (
		<Player
			{...base}
			analysis={analysis.analysis}
			analysisStatus={analysis.status}
		/>
	);
}

test("routine analysis refresh preserves waveform zoom throughout the request", async () => {
	const service = new MockTauriService();
	let finishRefresh: (value: TrackAnalysis) => void = () => {};
	const getAnalysis = rs
		.spyOn(service, "getSongAnalysis")
		.mockResolvedValueOnce(exampleAnalysis)
		.mockImplementation(
			() =>
				new Promise((resolve) => {
					finishRefresh = resolve;
				}),
		);

	const { container } = render(
		<TauriProvider service={service}>
			<Harness />
		</TauriProvider>,
	);
	const ui = within(container);
	await waitFor(() =>
		expect(
			ui.queryByRole("button", { name: "Zoom in waveform" }),
		).not.toBeNull(),
	);
	fireEvent.click(ui.getByRole("button", { name: "Zoom in waveform" }));
	expect(ui.queryByText("4 bars")).not.toBeNull();
	const status = await service.getRekordboxStatus();
	await act(async () => {
		(
			service as unknown as {
				emit: (event: string, payload: RekordboxStatus) => void;
			}
		).emit("rekordbox://updated", status);
	});
	await waitFor(() => expect(getAnalysis).toHaveBeenCalledTimes(2));
	expect(ui.queryByText("4 bars")).not.toBeNull();
	await act(async () =>
		finishRefresh({ ...exampleAnalysis, beats: [...exampleAnalysis.beats] }),
	);
	expect(ui.queryByText("4 bars")).not.toBeNull();
});
