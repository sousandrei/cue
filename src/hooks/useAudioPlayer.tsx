import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { barSeekTarget } from "@/lib/audio";
import { MemoryAudioPlayer } from "@/lib/MemoryAudioPlayer";
import type { Song, TrackAnalysis } from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";
import { useTrackAnalysis } from "./useTrackAnalysis";

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
	analysis: TrackAnalysis | null;
	analysisStatus: ReturnType<typeof useTrackAnalysis>["status"];
	skipBar: (direction: -1 | 1) => void;
	getPosition: () => number;
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
	const audioRef = useRef<MemoryAudioPlayer | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const sourceUrlRef = useRef<string | null>(null);
	const requestRef = useRef(0);
	const songRef = useRef<Song | null>(null);
	const [state, setState] = useState(initialState);
	if (!audioRef.current) audioRef.current = new MemoryAudioPlayer();
	const trackAnalysis = useTrackAnalysis(state.song?.id);
	const getPosition = useCallback(() => audioRef.current?.position ?? 0, []);

	const stop = useCallback(() => {
		requestRef.current++;
		songRef.current = null;
		const audio = audioRef.current;
		abortRef.current?.abort();
		sourceUrlRef.current = null;
		audio?.reset();
		setState((previous) => ({ ...initialState, volume: previous.volume }));
	}, []);

	const loadSong = useCallback(
		async (song: Song, startPlayback = false) => {
			const audio = audioRef.current;
			if (!audio) return;
			const request = ++requestRef.current;
			abortRef.current?.abort();
			const abort = new AbortController();
			abortRef.current = abort;
			sourceUrlRef.current = null;
			audio.reset();
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
				sourceUrlRef.current = url;
				await audio.load(url, abort.signal);
				if (request !== requestRef.current) return;
				setState((previous) => ({
					...previous,
					duration: audio.duration,
					loading: false,
				}));
				if (startPlayback) {
					await audio.play();
					if (request === requestRef.current)
						setState((previous) => ({ ...previous, playing: audio.playing }));
				}
			} catch (error) {
				if (request !== requestRef.current) return;
				sourceUrlRef.current = null;
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
		if (audio.playing) {
			audio.pause();
			setState((previous) => ({
				...previous,
				playing: false,
				position: audio.position,
			}));
			return;
		}
		// Reload on retry so missing or replaced files are resolved again.
		if (!sourceUrlRef.current) {
			void loadSong(song, true);
			return;
		}
		const request = requestRef.current;
		setState((previous) => ({ ...previous, error: null }));
		void audio
			.play()
			.then(() => {
				if (request === requestRef.current)
					setState((previous) => ({
						...previous,
						playing: audio.playing,
						position: audio.position,
					}));
			})
			.catch(() => {
				if (request === requestRef.current)
					setState((previous) => ({
						...previous,
						loading: false,
						playing: false,
						error: "Could not resume playback. Try loading the track again.",
					}));
			});
	}, [loadSong]);

	const seek = useCallback((position: number) => {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0)
			return;
		audio.seek(position);
		setState((previous) => ({ ...previous, position: audio.position }));
	}, []);

	const skipBar = useCallback(
		(direction: -1 | 1) => {
			seek(
				barSeekTarget(
					getPosition(),
					direction,
					trackAnalysis.analysis?.beats ?? [],
				),
			);
		},
		[getPosition, seek, trackAnalysis.analysis],
	);

	const setVolume = useCallback((volume: number) => {
		const value = Math.max(0, Math.min(volume, 1));
		if (audioRef.current) audioRef.current.setVolume(value);
		setState((previous) => ({ ...previous, volume: value }));
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.setVolume(initialState.volume);
		audio.onEnded = () =>
			setState((previous) => ({
				...previous,
				playing: false,
				position: audio.duration,
			}));
		const timer = window.setInterval(() => {
			if (audio.playing)
				setState((previous) => ({
					...previous,
					playing: true,
					position: audio.position,
				}));
		}, 100);
		return () => {
			requestRef.current++;
			abortRef.current?.abort();
			window.clearInterval(timer);
			audio.dispose();
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
					sourceUrlRef.current &&
					sourceUrlRef.current !== url
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
			const waveformFocused =
				target instanceof Element &&
				target.closest("[data-waveform], [data-audio-seek]");
			if (
				!waveformFocused &&
				target instanceof Element &&
				target.closest(
					"input, textarea, select, a, [role='slider'], [role='textbox'], [contenteditable='true']",
				)
			)
				return;
			if (
				target instanceof Element &&
				target.closest("button") &&
				(event.code === "Space" || !target.closest("[data-audio-player]"))
			)
				return;
			if (event.code === "Space") {
				event.preventDefault();
				toggle();
			} else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
				event.preventDefault();
				skipBar(event.code === "ArrowLeft" ? -1 : 1);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [skipBar, toggle]);

	return (
		<AudioPlayerContext.Provider
			value={{
				...state,
				analysis: trackAnalysis.analysis,
				analysisStatus: trackAnalysis.status,
				loadSong,
				toggle,
				seek,
				skipBar,
				getPosition,
				setVolume,
				stop,
			}}
		>
			{children}
		</AudioPlayerContext.Provider>
	);
}

export function useAudioPlayer() {
	const player = useContext(AudioPlayerContext);
	if (!player)
		throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
	return player;
}
