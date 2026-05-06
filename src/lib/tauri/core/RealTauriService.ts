import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask, open } from "@tauri-apps/plugin-dialog";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type {
	Config,
	DownloadJob,
	MetadataPayload,
	Song,
	TauriService,
} from "./types";

export class RealTauriService implements TauriService {
	async getConfig(): Promise<Config | null> {
		return await invoke<Config | null>("get_config");
	}

	async updateConfig(newConfig: Config): Promise<void> {
		return await invoke("update_config", { newConfig });
	}

	async initializeSetup(libraryPath: string): Promise<void> {
		return await invoke("initialize_setup", { libraryPath });
	}

	async getMetadata(url: string): Promise<MetadataPayload[]> {
		return await invoke<MetadataPayload[]>("get_metadata", { url });
	}

	async readFileContent(path: string): Promise<string> {
		return await invoke<string>("read_file_content", { path });
	}

	async getSongById(id: string): Promise<Song | null> {
		return await invoke<Song | null>("get_song_by_id", { id });
	}

	async cancelDownload(id: string): Promise<void> {
		return await invoke("cancel_download", { id });
	}

	async addToQueue(
		url: string,
		id: string,
		metadata: MetadataPayload,
	): Promise<void> {
		return await invoke("add_to_queue", { url, id, metadata });
	}

	async getDownloads(): Promise<DownloadJob[]> {
		return await invoke<DownloadJob[]>("get_downloads");
	}

	async removeDownload(id: string): Promise<void> {
		return await invoke("remove_download", { id });
	}

	async clearHistory(): Promise<void> {
		return await invoke("clear_history");
	}

	async clearQueue(): Promise<void> {
		return await invoke("clear_queue");
	}

	async checkHealth(): Promise<boolean> {
		return await invoke<boolean>("check_health");
	}

	async getSongs(): Promise<Song[]> {
		return await invoke<Song[]>("get_songs");
	}

	async removeSong(id: string): Promise<void> {
		return await invoke("remove_song", { id });
	}

	async factoryReset(): Promise<void> {
		return await invoke("factory_reset");
	}

	async checkMissingSongs(): Promise<string[]> {
		return await invoke<string[]>("check_missing_songs");
	}

	async syncSong(id: string): Promise<void> {
		return await invoke("sync_song", { id });
	}

	async listen<T>(event: string, handler: (event: any) => void) {
		return await listen<T>(event, handler);
	}

	async open(options: any) {
		return await open(options);
	}

	async ask(message: string, options: any) {
		return await ask(message, options);
	}

	async relaunch() {
		await relaunch();
	}

	async checkUpdate() {
		return await check();
	}
}
