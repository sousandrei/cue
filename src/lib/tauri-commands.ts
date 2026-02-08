import { invoke } from "@tauri-apps/api/core";

export interface Config {
	library_path: string;
	yt_dlp_version: string;
}

export interface MetadataPayload {
	id: string;
	url: string;
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
	is_cancelled: boolean;
}

/**
 * Fetches the current configuration. Returns null if not initialized.
 */
export async function getConfig(): Promise<Config | null> {
	return await invoke<Config | null>("get_config");
}

/**
 * Updates the configuration.
 */
export async function updateConfig(newConfig: Config): Promise<void> {
	return await invoke("update_config", { newConfig });
}

/**
 * Initializes the application setup.
 */
export async function initializeSetup(libraryPath: string): Promise<void> {
	return await invoke("initialize_setup", { libraryPath });
}

/**
 * Fetches metadata for a given URL using the backend get_metadata command.
 */
export async function getMetadata(url: string): Promise<MetadataPayload[]> {
	return await invoke<MetadataPayload[]>("get_metadata", { url });
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

export interface Song {
	id: string;
	title: string;
	artist: string;
	album?: string;
	filename: string;
}

/**
 * Reads the content of a file from the given path.
 */
export async function readFileContent(path: string): Promise<string> {
	return await invoke<string>("read_file_content", { path });
}

/**
 * Gets a song by its unique ID. Returns null if not found.
 */
export async function getSongById(id: string): Promise<Song | null> {
	return await invoke<Song | null>("get_song_by_id", { id });
}

/**
 * Cancels an ongoing download job.
 */
export async function cancelDownload(id: string): Promise<void> {
	return await invoke("cancel_download", { id });
}
