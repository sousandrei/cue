import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { barSeekTarget } from "@/lib/audio";
import { MemoryAudioPlayer } from "@/lib/MemoryAudioPlayer";
import { startPlaybackUpdates } from "@/lib/playbackScheduling";
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
	getPosition: (frameTime?: number) => number;
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
// Collection rows need track selection, never the continuously advancing clock.
const AudioPlayerSelectionContext = createContext<{
	songId: string | undefined;
	loadSong: AudioPlayer["loadSong"];
} | null>(null);

export function AudioPlayerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const tauri = useTauri();
	const audioRef = useRef<MemoryAudioPlayer | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	const sourceUrlRef = useRef<string | null>(null);
	const loadingRef = useRef(false);
	const playAfterLoadRef = useRef(false);
	const requestRef = useRef(0);
	const songRef = useRef<Song | null>(null);
	const [state, setState] = useState(initialState);
	if (!audioRef.current) audioRef.current = new MemoryAudioPlayer();
	const trackAnalysis = useTrackAnalysis(state.song?.id);
	const getPosition = useCallback((frameTime?: number) => {
		const audio = audioRef.current;
		return (
			(frameTime === undefined
				? audio?.position
				: audio?.getVisualPosition(frameTime)) ?? 0
		);
	}, []);

	const stop = useCallback(() => {
		requestRef.current++;
		songRef.current = null;
		const audio = audioRef.current;
		abortRef.current?.abort();
		sourceUrlRef.current = null;
		loadingRef.current = false;
		playAfterLoadRef.current = false;
		audio?.reset();
		setState((previous) => ({ ...initialState, volume: previous.volume }));
	}, []);

	const loadSong = useCallback(
		async (song: Song, startPlayback = false) => {
			const audio = audioRef.current;
			if (!audio) return;
			const request = ++requestRef.current;
			loadingRef.current = true;
			playAfterLoadRef.current = startPlayback;
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
				loadingRef.current = false;
				setState((previous) => ({
					...previous,
					duration: audio.duration,
					loading: false,
				}));
				if (playAfterLoadRef.current) {
					await audio.play();
					if (request === requestRef.current)
						setState((previous) => ({ ...previous, playing: audio.playing }));
				}
			} catch (error) {
				if (request !== requestRef.current) return;
				sourceUrlRef.current = null;
				loadingRef.current = false;
				playAfterLoadRef.current = false;
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
		if (loadingRef.current) {
			playAfterLoadRef.current = !playAfterLoadRef.current;
			return;
		}
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

		return () => {
			requestRef.current++;
			abortRef.current?.abort();
			audio.dispose();
		};
	}, []);

	useEffect(() => {
		const audio = audioRef.current;
		if (!state.playing || !audio) return;
		return startPlaybackUpdates(() => {
			if (!audio.playing) return;
			const position = audio.position;
			setState((previous) =>
				previous.position === position ? previous : { ...previous, position },
			);
		}, 100);
	}, [state.playing]);

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
				!target.closest("[data-load-track][aria-pressed='true']") &&
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

	const selection = useMemo(
		() => ({ songId: state.song?.id, loadSong }),
		[state.song?.id, loadSong],
	);

	return (
		<AudioPlayerSelectionContext.Provider value={selection}>
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
		</AudioPlayerSelectionContext.Provider>
	);
}

export function useAudioPlayer() {
	const player = useContext(AudioPlayerContext);
	if (!player)
		throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
	return player;
}

export function useAudioPlayerSelection() {
	const selection = useContext(AudioPlayerSelectionContext);
	if (!selection)
		throw new Error(
			"useAudioPlayerSelection must be used within AudioPlayerProvider",
		);
	return selection;
}
