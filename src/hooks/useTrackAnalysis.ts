import { useEffect, useState } from "react";
import type { TrackAnalysis } from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";

type AnalysisStatus = "idle" | "loading" | "ready" | "unavailable" | "error";
export function useTrackAnalysis(songId: string | undefined) {
	const tauri = useTauri();
	const [state, setState] = useState<{
		songId?: string;
		analysis: TrackAnalysis | null;
		status: AnalysisStatus;
	}>({ analysis: null, status: "idle" });
	useEffect(() => {
		if (!songId) return;
		let disposed = false;
		let request = 0;
		const refresh = async () => {
			const current = ++request;
			// Keep an existing same-track waveform mounted during background refreshes.
			setState((previous) =>
				previous.songId === songId && previous.analysis
					? { ...previous, status: "ready" }
					: { songId, analysis: null, status: "loading" },
			);
			try {
				const analysis = await tauri.getSongAnalysis(songId);
				if (!disposed && current === request)
					setState({
						songId,
						analysis,
						status: analysis ? "ready" : "unavailable",
					});
			} catch {
				if (!disposed && current === request)
					setState((previous) => ({
						songId,
						analysis: previous.songId === songId ? previous.analysis : null,
						status: "error",
					}));
			}
		};
		void refresh();
		const subscription = tauri.listen("rekordbox://updated", ({ payload }) => {
			if (payload.sync_state !== "reading") void refresh();
		});
		return () => {
			disposed = true;
			void subscription.then((unlisten) => unlisten());
		};
	}, [songId, tauri]);
	return state.songId === songId
		? state
		: {
				analysis: null,
				status: songId ? ("loading" as const) : ("idle" as const),
			};
}
