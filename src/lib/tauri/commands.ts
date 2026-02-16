import { invoke, isTauri } from "@tauri-apps/api/core";

export interface Config {
	library_path: string;
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
	detailed_status?: string;
	url: string;
	metadata: MetadataPayload;
	logs: string[];
}

export interface DownloadProgressPayload {
	id: string;
	progress: number;
	status: "pending" | "downloading" | "completed" | "error";
	detailed_status?: string;
	log?: string;
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
	if (!isTauri()) {
		return {
			library_path: "/mock/library",
			auto_update: false,
		};
	}
	return await invoke<Config | null>("get_config");
}

/**
 * Updates the configuration.
 */
export async function updateConfig(newConfig: Config): Promise<void> {
	if (!isTauri()) {
		console.log("Mock updateConfig:", newConfig);
		return;
	}
	return await invoke("update_config", { newConfig });
}

/**
 * Initializes the application setup.
 */
export async function initializeSetup(libraryPath: string): Promise<void> {
	if (!isTauri()) {
		console.log("Mock initializeSetup:", libraryPath);
		return;
	}
	return await invoke("initialize_setup", { libraryPath });
}

/**
 * Fetches metadata for a given URL using the backend get_metadata command.
 */
export async function getMetadata(url: string): Promise<MetadataPayload[]> {
	if (!isTauri()) {
		return [
			{
				id: "mock-id",
				url,
				title: "Mock Song Title",
				artist: "Mock Artist",
				album: "Mock Album",
				thumbnail: "https://via.placeholder.com/150",
				duration: 180,
			},
		];
	}
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
	if (!isTauri()) {
		return "Mock file content";
	}
	return await invoke<string>("read_file_content", { path });
}

/**
 * Gets a song by its unique ID. Returns null if not found.
 */
export async function getSongById(id: string): Promise<Song | null> {
	if (!isTauri()) {
		return {
			id,
			title: "Mock Song",
			artist: "Mock Artist",
			filename: "mock.mp3",
		};
	}
	return await invoke<Song | null>("get_song_by_id", { id });
}

/**
 * Cancels an ongoing download job.
 */
export async function cancelDownload(id: string): Promise<void> {
	if (!isTauri()) {
		console.log("Mock cancelDownload:", id);
		return;
	}
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
	if (!isTauri()) {
		console.log("Mock addToQueue:", { url, id, metadata });
		return;
	}
	return await invoke("add_to_queue", { url, id, metadata });
}

/**
 * Gets the current list of download jobs.
 */
export async function getDownloads(): Promise<DownloadJob[]> {
	if (!isTauri()) {
		return [
			{
				id: "mock-download-1",
				title: "Mock Song - Downloading",
				progress: 45,
				status: "downloading",
				detailed_status: "Downloading audio...",
				url: "https://www.youtube.com/watch?v=mock1",
				metadata: {
					id: "mock1",
					url: "https://www.youtube.com/watch?v=mock1",
					title: "Mock Song - Downloading",
					artist: "Mock Artist",
					album: "Mock Album",
					thumbnail: "https://via.placeholder.com/150",
					duration: 210,
				},
				logs: ["Starting download..."],
			},
			{
				id: "mock-download-2",
				title: "Mock Song - Queued",
				progress: 0,
				status: "queued",
				url: "https://www.youtube.com/watch?v=mock2",
				metadata: {
					id: "mock2",
					url: "https://www.youtube.com/watch?v=mock2",
					title: "Mock Song - Queued",
					artist: "Mock Artist 2",
					album: "Mock Album 2",
					thumbnail: "https://via.placeholder.com/150",
					duration: 180,
				},
				logs: [],
			},
			{
				id: "mock-download-3",
				title: "Mock Song - Completed",
				progress: 100,
				status: "completed",
				url: "https://www.youtube.com/watch?v=mock3",
				metadata: {
					id: "mock3",
					url: "https://www.youtube.com/watch?v=mock3",
					title: "Mock Song - Completed",
					artist: "Mock Artist 3",
					album: "Mock Album 3",
					thumbnail: "https://via.placeholder.com/150",
					duration: 240,
				},
				logs: ["Download complete."],
			},
		];
	}
	return await invoke("get_downloads");
}

/**
 * Removes a download job.
 */
export async function removeDownload(id: string): Promise<void> {
	if (!isTauri()) {
		console.log("Mock removeDownload:", id);
		return;
	}
	return await invoke("remove_download", { id });
}

/**
 * Clears completed/error downloads.
 */
export async function clearHistory(): Promise<void> {
	if (!isTauri()) {
		console.log("Mock clearHistory");
		return;
	}
	return await invoke("clear_history");
}

/**
 * Clears the queued downloads.
 */
export async function clearQueue(): Promise<void> {
	if (!isTauri()) {
		console.log("Mock clearQueue");
		return;
	}
	return await invoke("clear_queue");
}

/**
 * Checks if all required binaries are present and healthy.
 */
export async function checkHealth(): Promise<boolean> {
	if (!isTauri()) {
		return true;
	}
	return await invoke<boolean>("check_health");
}

/**
 * Fetches all songs from the library.
 */
export async function getSongs(): Promise<Song[]> {
	if (!isTauri()) {
		return [
			{
				id: "mock-song-1",
				title: "Mock Song 1",
				artist: "Mock Artist 1",
				album: "Mock Album 1",
				filename: "mock1.mp3",
			},
			{
				id: "mock-song-2",
				title: "Mock Song 2",
				artist: "Mock Artist 2",
				album: "Mock Album 2",
				filename: "mock2.mp3",
			},
		];
	}
	return await invoke<Song[]>("get_songs");
}

/**
 * Removes a song from the library.
 */
export async function removeSong(id: string): Promise<void> {
	if (!isTauri()) {
		console.log("Mock removeSong:", id);
		return;
	}
	return await invoke("remove_song", { id });
}

/**
 * Performs a factory reset of the application.
 */
export async function factoryReset(): Promise<void> {
	if (!isTauri()) {
		console.log("Mock factoryReset");
		return;
	}
	return await invoke("factory_reset");
}
