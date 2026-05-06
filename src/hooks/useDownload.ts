import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
	DownloadErrorPayload,
	DownloadJob,
	DownloadProgressPayload,
	MetadataPayload,
} from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";

export type { DownloadJob };

export function useDownload() {
	const tauri = useTauri();
	const [downloads, setDownloads] = useState<DownloadJob[]>([]);

	useEffect(() => {
		// Initial fetch
		tauri.getDownloads().then(setDownloads).catch(console.error);

		const unlistenList = tauri.listen("download://list-updated", (event) => {
			setDownloads(event.payload as DownloadJob[]);
		});

		const unlistenProgress = tauri.listen<DownloadProgressPayload>(
			"download://progress",
			(event) => {
				const payload = event.payload;
				setDownloads((prev) =>
					prev.map((d) => {
						if (d.id === payload.id) {
							let newLogs = d.logs || [];
							if (payload.log) {
								newLogs = [...newLogs, payload.log];
							}
							return {
								...d,
								progress:
									payload.progress === -1 ? d.progress : payload.progress,
								status: payload.status as DownloadJob["status"],
								detailed_status: payload.detailed_status || d.detailed_status,
								logs: newLogs,
							};
						}
						return d;
					}),
				);
			},
		);

		const unlistenError = tauri.listen("download://error", (event) => {
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
	}, [tauri]);

	const startDownload = useCallback(
		async (url: string, metadata: MetadataPayload) => {
			try {
				await tauri.addToQueue(url, metadata.id, metadata);
			} catch (err) {
				toast.error(`Failed to add to queue: ${err}`);
			}
		},
		[tauri],
	);

	const removeDownload = useCallback(
		(id: string) => {
			const job = downloads.find((d) => d.id === id);
			if (job && (job.status === "downloading" || job.status === "pending")) {
				tauri.cancelDownload(id).catch(console.error);
			}
			tauri.removeDownload(id).catch(console.error);
		},
		[downloads, tauri],
	);

	const clearHistory = useCallback(() => {
		tauri.clearHistory().catch(console.error);
	}, [tauri]);

	const clearQueue = useCallback(() => {
		tauri.clearQueue().catch(console.error);
	}, [tauri]);

	return {
		downloads,
		startDownload,
		removeDownload,
		clearHistory,
		clearQueue,
	};
}
