import { invoke } from "@tauri-apps/api/core";

export interface Config {
	library_path: string;
	yt_dlp_version: string;
	auto_update: boolean;
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

export interface DownloadJob {
	id: string;
	title: string;
	progress: number;
	status: "queued" | "pending" | "downloading" | "completed" | "error";
	url: string;
	metadata: MetadataPayload;
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

/**
 * Adds a new job to the download queue.
 */
export async function addToQueue(
	url: string,
	id: string,
	metadata: MetadataPayload,
): Promise<void> {
	return await invoke("add_to_queue", { url, id, metadata });
}

/**
 * Gets the current list of download jobs.
 */
export async function getDownloads(): Promise<DownloadJob[]> {
	return await invoke("get_downloads");
}

/**
 * Removes a download job.
 */
export async function removeDownload(id: string): Promise<void> {
	return await invoke("remove_download", { id });
}

/**
 * Clears completed/error downloads.
 */
export async function clearHistory(): Promise<void> {
	return await invoke("clear_history");
}

/**
 * Clears the queued downloads.
 */
export async function clearQueue(): Promise<void> {
	return await invoke("clear_queue");
}

/**
 * Checks if all required binaries are present and healthy.
 */
export async function checkHealth(): Promise<boolean> {
	return await invoke<boolean>("check_health");
}
