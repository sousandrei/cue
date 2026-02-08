import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { DownloadJob } from "@/lib/tauri-commands";
import {
	addToQueue,
	cancelDownload,
	clearHistory as clearHistoryBackend,
	clearQueue as clearQueueBackend,
	type DownloadErrorPayload,
	getDownloads,
	type MetadataPayload,
	removeDownload as removeDownloadBackend,
} from "@/lib/tauri-commands";

export type { DownloadJob };

export function useDownload() {
	const [downloads, setDownloads] = useState<DownloadJob[]>([]);

	useEffect(() => {
		// Initial fetch
		getDownloads().then(setDownloads).catch(console.error);

		const unlistenList = listen("download://list-updated", (event) => {
			setDownloads(event.payload as DownloadJob[]);
		});

		const unlistenProgress = listen("download://progress", (event) => {
			// Manual update for smoothness if needed, but list-updated might be enough.
			// However, list-updated is only emitted on state changes, progress is high freq.
			// Let's keep a quick local update for the progress specifically.
			const payload = event.payload as {
				id: string;
				progress: number;
				status: string;
			};
			setDownloads((prev) =>
				prev.map((d) => {
					if (d.id === payload.id) {
						return {
							...d,
							progress: payload.progress,
							status: payload.status as DownloadJob["status"],
						};
					}
					return d;
				}),
			);
		});

		const unlistenError = listen("download://error", (event) => {
			const payload = event.payload as DownloadErrorPayload;
			if (!payload.is_cancelled) {
				toast.error(`Download failed: ${payload.error}`);
			}
		});

		return () => {
			unlistenList.then((f) => f());
			unlistenProgress.then((f) => f());
			unlistenError.then((f) => f());
		};
	}, []);

	const startDownload = useCallback(
		async (url: string, metadata: MetadataPayload) => {
			try {
				await addToQueue(url, metadata.id, metadata);
			} catch (err) {
				toast.error(`Failed to add to queue: ${err}`);
			}
		},
		[],
	);

	const removeDownload = useCallback(
		(id: string) => {
			const job = downloads.find((d) => d.id === id);
			if (job && (job.status === "downloading" || job.status === "pending")) {
				cancelDownload(id).catch(console.error);
			}
			removeDownloadBackend(id).catch(console.error);
		},
		[downloads],
	);

	const clearHistory = useCallback(() => {
		clearHistoryBackend().catch(console.error);
	}, []);

	const clearQueue = useCallback(() => {
		clearQueueBackend().catch(console.error);
	}, []);

	return {
		downloads,
		startDownload,
		removeDownload,
		clearHistory,
		clearQueue,
	};
}
