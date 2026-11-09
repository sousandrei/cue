import { expect, rs, test } from "@rstest/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MockTauriService } from "@/lib/tauri/core/MockTauriService";
import type { TrackAnalysis } from "@/lib/tauri/core/types";
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
