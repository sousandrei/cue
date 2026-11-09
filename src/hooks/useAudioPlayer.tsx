import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Song } from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";

export interface AudioPlayerState {
	song: Song | null;
	playing: boolean;
	loading: boolean;
	position: number;
	duration: number;
	volume: number;
	error: string | null;
}

interface AudioPlayer extends AudioPlayerState {
	loadSong: (song: Song) => Promise<void>;
	toggle: () => void;
	seek: (position: number) => void;
	setVolume: (volume: number) => void;
	stop: () => void;
}

const initialState: AudioPlayerState = {
	song: null,
	playing: false,
	loading: false,
	position: 0,
	duration: 0,
	volume: 0.8,
	error: null,
};
const AudioPlayerContext = createContext<AudioPlayer | null>(null);

export function AudioPlayerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const tauri = useTauri();
	const audioRef = useRef<HTMLAudioElement>(null);
	const requestRef = useRef(0);
	const songRef = useRef<Song | null>(null);
	const [state, setState] = useState(initialState);

	const stop = useCallback(() => {
		requestRef.current++;
		songRef.current = null;
		const audio = audioRef.current;
		if (audio) {
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
		}
		setState((previous) => ({ ...initialState, volume: previous.volume }));
	}, []);

	const loadSong = useCallback(
		async (song: Song, startPlayback = false) => {
			const audio = audioRef.current;
			if (!audio) return;
			const request = ++requestRef.current;
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
			songRef.current = song;
			setState((previous) => ({
				...initialState,
				volume: previous.volume,
				song,
				loading: true,
			}));
			try {
				const url = await tauri.getSongAudioUrl(song.id);
				if (request !== requestRef.current) return;
				audio.src = url;
				audio.load();
				if (startPlayback) await audio.play();
			} catch (error) {
				if (request !== requestRef.current) return;
				setState((previous) => ({
					...previous,
					loading: false,
					playing: false,
					error:
						typeof error === "string"
							? error
							: "Could not play this track. Try again or check the local file.",
				}));
			}
		},
		[tauri],
	);

	const toggle = useCallback(() => {
		const audio = audioRef.current;
		const song = songRef.current;
		if (!audio || !song) return;
		if (!audio.paused) {
			audio.pause();
			return;
		}
		// Reload on retry so missing or replaced files are resolved again.
		if (!audio.getAttribute("src") || audio.error) {
			void loadSong(song, true);
			return;
		}
		const request = requestRef.current;
		setState((previous) => ({ ...previous, error: null }));
		void audio.play().catch(() => {
			if (request === requestRef.current)
				setState((previous) => ({
					...previous,
					loading: false,
					error: "Could not resume playback. Try loading the track again.",
				}));
		});
	}, [loadSong]);

	const seek = useCallback((position: number) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
			return;
		audio.currentTime = Math.max(0, Math.min(position, audio.duration));
		setState((previous) => ({ ...previous, position: audio.currentTime }));
	}, []);

	const setVolume = useCallback((volume: number) => {
		const value = Math.max(0, Math.min(volume, 1));
		if (audioRef.current) audioRef.current.volume = value;
		setState((previous) => ({ ...previous, volume: value }));
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (audio) audio.volume = initialState.volume;
		return () => {
			requestRef.current++;
			audio?.pause();
		};
	}, []);

	useEffect(() => {
		const validateTrack = async () => {
			const song = songRef.current;
			if (!song) return;
			const request = requestRef.current;
			try {
				const url = await tauri.getSongAudioUrl(song.id);
				if (
					request === requestRef.current &&
					audioRef.current?.getAttribute("src") &&
					audioRef.current.src !== url
				)
					stop();
			} catch {
				if (request === requestRef.current) stop();
			}
		};
		const subscriptions = [
			tauri.listen("library://updated", validateTrack),
			tauri.listen("config://update", () => stop()),
		];
		return () => {
			for (const subscription of subscriptions)
				void subscription.then((unlisten) => unlisten());
		};
	}, [tauri, stop]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				!songRef.current
			)
				return;
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest(
					"input, textarea, select, button, a, [role='slider'], [role='textbox'], [contenteditable='true']",
				)
			)
				return;
			if (event.code === "Space") {
				event.preventDefault();
				toggle();
			} else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
				event.preventDefault();
				seek(
					(audioRef.current?.currentTime ?? 0) +
						(event.code === "ArrowLeft" ? -5 : 5),
				);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [seek, toggle]);

	const updateTime = () => {
		const audio = audioRef.current;
		if (!audio?.getAttribute("src")) return;
		setState((previous) => ({
			...previous,
			position: audio.currentTime,
			duration: Number.isFinite(audio.duration) ? audio.duration : 0,
		}));
	};

	return (
		<AudioPlayerContext.Provider
			value={{ ...state, loadSong, toggle, seek, setVolume, stop }}
		>
			{children}
			{/* biome-ignore lint/a11y/useMediaCaption: Local music has no caption track; accessible playback controls are provided in Collection. */}
			<audio
				ref={audioRef}
				preload="metadata"
				onTimeUpdate={updateTime}
				onDurationChange={updateTime}
				onLoadedMetadata={() => {
					updateTime();
					setState((previous) => ({ ...previous, loading: false }));
				}}
				onPlaying={() =>
					setState((previous) => ({
						...previous,
						playing: true,
						loading: false,
						error: null,
					}))
				}
				onPause={() =>
					setState((previous) => ({
						...previous,
						playing: false,
						loading: false,
					}))
				}
				onWaiting={() =>
					setState((previous) => ({ ...previous, loading: true }))
				}
				onCanPlay={() =>
					setState((previous) => ({ ...previous, loading: false }))
				}
				onEnded={() =>
					setState((previous) => ({
						...previous,
						playing: false,
						loading: false,
					}))
				}
				onError={() => {
					if (audioRef.current?.getAttribute("src"))
						setState((previous) => ({
							...previous,
							playing: false,
							loading: false,
							error:
								"Could not read this audio file. Try syncing the track again.",
						}));
				}}
			/>
		</AudioPlayerContext.Provider>
	);
}

export function useAudioPlayer() {
	const player = useContext(AudioPlayerContext);
	if (!player)
		throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
	return player;
}
