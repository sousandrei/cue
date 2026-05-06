import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import type {
	Config,
	DownloadJob,
	MetadataPayload,
	Song,
	TauriEventMap,
	TauriService,
} from "./types";

export class MockTauriService implements TauriService {
	// biome-ignore lint/suspicious/noExplicitAny: internal handler mapping
	private handlers: Record<string, ((event: Event<any>) => void)[]> = {};

	async getConfig(): Promise<Config | null> {
		return {
			library_path: "/mock/library",
			auto_update: false,
		};
	}

	async updateConfig(newConfig: Config): Promise<void> {
		console.log("[Mock] updateConfig:", newConfig);
	}

	async initializeSetup(libraryPath: string): Promise<void> {
		console.log("[Mock] initializeSetup:", libraryPath);
	}

	async getMetadata(url: string): Promise<MetadataPayload[]> {
		return [
			{
				id: Math.random().toString(36).substring(7),
				url,
				title: "Mock Song Title",
				artist: "Mock Artist",
				album: "Mock Album",
				thumbnail:
					"https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
				duration: 180,
			},
		];
	}

	async readFileContent(_path: string): Promise<string> {
		return "Mock file content";
	}

	async getSongById(id: string): Promise<Song | null> {
		return {
			id,
			title: "Mock Song",
			artist: "Mock Artist",
			filename: "mock.mp3",
		};
	}

	async cancelDownload(id: string): Promise<void> {
		console.log("[Mock] cancelDownload:", id);
	}

	async addToQueue(
		url: string,
		id: string,
		metadata: MetadataPayload,
	): Promise<void> {
		console.log("[Mock] addToQueue:", { url, id, metadata });

		// Simulate download progress
		let progress = 0;
		const interval = setInterval(() => {
			progress += 10;
			this.emit("download-progress", {
				id,
				progress,
				status: progress >= 100 ? "completed" : "downloading",
				detailed_status: `Downloading... ${progress}%`,
			});

			if (progress >= 100) {
				clearInterval(interval);
			}
		}, 1000);
	}

	async getDownloads(): Promise<DownloadJob[]> {
		return [
			{
				id: "mock-dl-1",
				title: "Mock Active Download",
				progress: 45,
				status: "downloading",
				detailed_status: "Downloading audio...",
				url: "https://example.com/1",
				metadata: {
					id: "1",
					url: "https://example.com/1",
					title: "Mock Active Download",
					artist: "Mock Artist",
					album: "Mock Album",
					thumbnail:
						"https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
					duration: 210,
				},
				logs: ["Starting..."],
			},
		];
	}

	async removeDownload(id: string): Promise<void> {
		console.log("[Mock] removeDownload:", id);
	}

	async clearHistory(): Promise<void> {
		console.log("[Mock] clearHistory");
	}

	async clearQueue(): Promise<void> {
		console.log("[Mock] clearQueue");
	}

	async checkHealth(): Promise<boolean> {
		return true;
	}

	async getSongs(): Promise<Song[]> {
		return [
			{
				id: "s1",
				title: "In My Mind",
				artist: "Dynoro",
				album: "Single",
				filename: "In My Mind.mp3",
				tags: "house,banger",
			},
			{
				id: "s2",
				title: "Mock Song 2",
				artist: "Mock Artist 2",
				album: "Mock Album 2",
				filename: "mock2.mp3",
				tags: "techno",
			},
		];
	}

	async removeSong(id: string): Promise<void> {
		console.error("[Mock] removeSong:", id);
	}

	async factoryReset(): Promise<void> {
		console.log("[Mock] factoryReset");
	}

	async checkMissingSongs(): Promise<string[]> {
		return [];
	}

	async syncSong(id: string): Promise<void> {
		console.log("[Mock] syncSong:", id);
	}

	async updateSongTags(id: string, tags: string): Promise<void> {
		console.log("[Mock] updateSongTags:", { id, tags });
	}

	async listen<K extends keyof TauriEventMap | string>(
		event: K,
		handler: (
			event: Event<K extends keyof TauriEventMap ? TauriEventMap[K] : any>,
		) => void,
	): Promise<UnlistenFn> {
		if (!this.handlers[event]) {
			this.handlers[event] = [];
		}
		this.handlers[event].push(handler);
		return () => {
			if (this.handlers[event]) {
				this.handlers[event] = this.handlers[event].filter(
					(h) => h !== handler,
				);
			}
		};
	}

	async open() {
		return "/mock/selected/path";
	}

	async ask() {
		return true;
	}

	async relaunch() {
		window.location.reload();
	}

	async checkUpdate() {
		return null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: internal event emission
	private emit(event: string, payload: any) {
		const handlers = this.handlers[event];
		if (handlers) {
			for (const handler of handlers) {
				handler({ payload, event, id: 0 });
			}
		}
	}
}
