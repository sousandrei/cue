import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import type {
	MessageDialogOptions,
	OpenDialogOptions,
} from "@tauri-apps/plugin-dialog";
import type { Update } from "@tauri-apps/plugin-updater";

export type { Update };

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

export interface Song {
	id: string;
	title: string;
	artist: string;
	album?: string;
	filename: string;
	source_url?: string | null;
	tags?: string | null;
	rekordbox?: RekordboxTrack;
}

export interface TrackAnalysis {
	/** Evenly spaced [height, red, green, blue] values in 0..255. */
	waveform: [number, number, number, number][];
	waveform_kind: "rgb" | "three_band" | "monochrome";
	waveform_duration: number | null;
	beats: { time: number; beat_number: number; bpm: number }[];
}

export interface RekordboxTrack {
	song_id: string;
	status: "imported" | "not_imported" | "ambiguous";
	rekordbox_id: string | null;
	bpm: number | null;
	key: string | null;
}

/** Mirrors the Rust `SyncState` enum. */
export type RekordboxSyncState =
	| "reading"
	| "pending"
	| "syncing"
	| "synced"
	| "error"
	| "unsupported";

export interface RekordboxStatus {
	supported: boolean;
	sync_state: RekordboxSyncState;
	sync_error: string | null;
	watching: boolean;
	available: boolean;
	running: boolean;
	database_path: string | null;
	checked_at: number;
	error: string | null;
	tracks: RekordboxTrack[];
}

export interface TauriEventMap {
	"rekordbox://updated": RekordboxStatus;
	"config://update": Config;
	"download://list-updated": DownloadJob[];
	"download://progress": DownloadProgressPayload;
	"download://error": DownloadErrorPayload;
	"library://updated": undefined;
	"setup://progress": { status: string; progress: number };
}

export interface TauriService {
	getRekordboxStatus(refresh?: boolean): Promise<RekordboxStatus>;
	// Commands
	getConfig(): Promise<Config | null>;
	updateConfig(newConfig: Config): Promise<void>;
	initializeSetup(libraryPath: string): Promise<void>;
	getMetadata(url: string): Promise<MetadataPayload[]>;
	readFileContent(path: string): Promise<string>;
	getSongById(id: string): Promise<Song | null>;
	cancelDownload(id: string): Promise<void>;
	addToQueue(url: string, id: string, metadata: MetadataPayload): Promise<void>;
	getDownloads(): Promise<DownloadJob[]>;
	removeDownload(id: string): Promise<void>;
	clearHistory(): Promise<void>;
	clearQueue(): Promise<void>;
	checkHealth(): Promise<boolean>;
	getSongs(): Promise<Song[]>;
	getSongAudioUrl(id: string): Promise<string>;
	getSongAnalysis(id: string): Promise<TrackAnalysis | null>;
	removeSong(id: string): Promise<void>;
	factoryReset(): Promise<void>;
	checkMissingSongs(): Promise<string[]>;
	syncSong(id: string): Promise<void>;
	updateSongTags(id: string, tags: string): Promise<void>;

	// API / Dialogs / System
	openUrl(url: string): Promise<void>;
	listen<K extends keyof TauriEventMap | string>(
		event: K,
		handler: (
			event: Event<K extends keyof TauriEventMap ? TauriEventMap[K] : unknown>,
		) => void,
	): Promise<UnlistenFn>;

	open(options?: OpenDialogOptions): Promise<null | string | string[]>;
	ask(message: string, options?: MessageDialogOptions): Promise<boolean>;
	relaunch(): Promise<void>;
	checkUpdate(): Promise<Update | null>;
}
