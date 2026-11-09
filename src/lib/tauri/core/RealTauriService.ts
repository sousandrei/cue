import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { type Event, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
	ask,
	type MessageDialogOptions,
	type OpenDialogOptions,
	open,
} from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import type {
	Config,
	DownloadJob,
	MetadataPayload,
	RekordboxStatus,
	Song,
	TauriEventMap,
	TauriService,
	TrackAnalysis,
} from "./types";

export class RealTauriService implements TauriService {
	async openUrl(url: string): Promise<void> {
		await openUrl(url);
	}

	async getRekordboxStatus(refresh = false): Promise<RekordboxStatus> {
		return await invoke<RekordboxStatus>("get_rekordbox_status", { refresh });
	}

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

	async getSongAnalysis(id: string): Promise<TrackAnalysis | null> {
		return await invoke<TrackAnalysis | null>("get_song_analysis", { id });
	}

	async getSongAudioUrl(id: string): Promise<string> {
		const path = await invoke<string>("get_song_audio_path", { id });
		return convertFileSrc(path);
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

	async updateSongTags(id: string, tags: string): Promise<void> {
		return await invoke("update_song_tags", { id, tags });
	}

	async listen<K extends keyof TauriEventMap | string>(
		event: K,
		handler: (
			event: Event<K extends keyof TauriEventMap ? TauriEventMap[K] : unknown>,
		) => void,
	): Promise<UnlistenFn> {
		return await listen<
			K extends keyof TauriEventMap ? TauriEventMap[K] : unknown
		>(event, handler);
	}

	async open(options?: OpenDialogOptions) {
		return await open(options);
	}

	async ask(message: string, options?: MessageDialogOptions) {
		return await ask(message, options);
	}

	async relaunch() {
		await relaunch();
	}

	async checkUpdate() {
		return await check();
	}
}
