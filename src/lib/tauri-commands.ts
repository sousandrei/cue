import { invoke } from "@tauri-apps/api/core";

export interface MetadataPayload {
	title: string;
	artist: string;
	album: string | null;
	thumbnail: string | null;
	duration: number | null;
}

export interface DownloadProgressPayload {
	id: string;
	progress: number;
	status: "pending" | "downloading" | "completed" | "error";
}

export interface DownloadErrorPayload {
	id: string;
	error: string;
}

/**
 * Fetches metadata for a given URL using the backend get_metadata command.
 */
export async function getMetadata(url: string): Promise<MetadataPayload> {
	return await invoke<MetadataPayload>("get_metadata", { url });
}

/**
 * Starts an audio download job.
 */
export async function downloadAudio(
	url: string,
	id: string,
	metadata: MetadataPayload,
): Promise<void> {
	return await invoke("download_audio", { url, id, metadata });
}
