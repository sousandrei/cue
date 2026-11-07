import type { DownloadJob, MetadataPayload } from "@/lib/tauri/core/types";

/** Illustrative music data for stories; never queued against a real service. */
export const trackMetadata: MetadataPayload = {
	id: "studio-track",
	url: "https://example.com/studio-track",
	title: "Midnight Signal",
	artist: "Studio fixture",
	album: "Example set",
	thumbnail: null,
	duration: 240,
};
export const activeDownload: DownloadJob = {
	id: "studio-active",
	title: trackMetadata.title,
	metadata: trackMetadata,
	url: trackMetadata.url,
	progress: 64,
	status: "downloading",
	detailed_status: "Downloading audio…",
	logs: ["Retrieving track information", "Downloading audio stream"],
};
export const completedDownload: DownloadJob = {
	...activeDownload,
	id: "studio-complete",
	progress: 100,
	status: "completed",
};
export const failedDownload: DownloadJob = {
	...activeDownload,
	id: "studio-error",
	status: "error",
	logs: ["The source could not be reached. Check the link and try again."],
};
export const queuedDownloads: DownloadJob[] = [
	"After Hours",
	"Velvet Frequency",
].map((title, index) => ({
	...activeDownload,
	id: `studio-queued-${index}`,
	title,
	metadata: { ...trackMetadata, id: `studio-queued-${index}`, title },
	progress: 0,
	status: "queued",
	logs: [],
}));
