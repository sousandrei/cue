import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
	cancelDownload,
	type DownloadErrorPayload,
	type DownloadProgressPayload,
	downloadAudio,
	type MetadataPayload,
} from "@/lib/tauri-commands";

export interface DownloadJob {
	id: string;
	title: string;
	progress: number;
	status: "queued" | "pending" | "downloading" | "completed" | "error";
	url: string;
	metadata: MetadataPayload;
}

export function useDownload() {
	const [downloads, setDownloads] = useState<DownloadJob[]>([]);

	useEffect(() => {
		const unlistenProgress = listen("download://progress", (event) => {
			const payload = event.payload as DownloadProgressPayload;
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
			setDownloads((prev) =>
				prev.map((d) => {
					if (d.id === payload.id) {
						return {
							...d,
							status: "error",
							title: payload.is_cancelled
								? "Download cancelled"
								: `Error: ${payload.error}`,
						};
					}
					return d;
				}),
			);
		});

		return () => {
			unlistenProgress.then((f) => f());
			unlistenError.then((f) => f());
		};
	}, []);

	// Queue processor
	useEffect(() => {
		const isProcessing = downloads.some(
			(d) => d.status === "pending" || d.status === "downloading",
		);

		if (!isProcessing) {
			const nextJob = downloads.find((d) => d.status === "queued");
			if (nextJob) {
				// Start the next job
				setDownloads((prev) =>
					prev.map((d) =>
						d.id === nextJob.id ? { ...d, status: "pending" } : d,
					),
				);

				downloadAudio(nextJob.url, nextJob.id, nextJob.metadata).catch(
					(err) => {
						const error = err instanceof Error ? err.message : String(err);
						toast.error(`Failed to start download: ${error}`);
						setDownloads((prev) =>
							prev.map((d) =>
								d.id === nextJob.id
									? {
											...d,
											status: "error",
											title: `Failed to start: ${error}`,
										}
									: d,
							),
						);
					},
				);
			}
		}
	}, [downloads]);

	const startDownload = useCallback(
		async (url: string, metadata: MetadataPayload) => {
			const id = metadata.id;
			const title = `${metadata.artist} - ${metadata.title}`;
			const newDownload: DownloadJob = {
				id,
				title,
				progress: 0,
				status: "queued",
				url: url,
				metadata,
			};

			setDownloads((prev) => [...prev, newDownload]);
		},
		[],
	);

	const removeDownload = useCallback(
		(id: string) => {
			const job = downloads.find((d) => d.id === id);
			if (job && (job.status === "downloading" || job.status === "pending")) {
				cancelDownload(id).catch((err) =>
					console.error("Failed to cancel download:", err),
				);
			}
			setDownloads((prev) => prev.filter((d) => d.id !== id));
		},
		[downloads],
	);

	const clearHistory = useCallback(() => {
		setDownloads((prev) =>
			prev.filter((d) => d.status !== "completed" && d.status !== "error"),
		);
	}, []);

	const clearQueue = useCallback(() => {
		setDownloads((prev) => prev.filter((d) => d.status !== "queued"));
	}, []);

	return {
		downloads,
		startDownload,
		removeDownload,
		clearHistory,
		clearQueue,
	};
}
