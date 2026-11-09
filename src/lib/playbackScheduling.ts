import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const BACKGROUND_INTERVAL = 200;
const listeners = new Set<(foreground: boolean) => void>();
let foreground = true;
let stopObserving: (() => void) | undefined;

function observeForeground() {
	let focused = document.hasFocus();
	let nativeFocused: boolean | undefined;
	let disposed = false;
	let focusRevision = 0;
	let unlistenNative: (() => void) | undefined;
	const update = () => {
		const next =
			document.visibilityState !== "hidden" && (nativeFocused ?? focused);
		if (next === foreground) return;
		foreground = next;
		for (const listener of listeners) listener(foreground);
	};
	const onFocus = () => {
		focused = true;
		update();
	};
	const onBlur = () => {
		focused = false;
		update();
	};
	window.addEventListener("focus", onFocus);
	window.addEventListener("blur", onBlur);
	document.addEventListener("visibilitychange", update);
	update();
	if (isTauri()) {
		const appWindow = getCurrentWindow();
		void appWindow
			.onFocusChanged(({ payload }) => {
				if (disposed) return;
				focusRevision++;
				nativeFocused = payload;
				update();
			})
			.then(async (unlisten) => {
				if (disposed) {
					unlisten();
					return;
				}
				unlistenNative = unlisten;
				// Subscribe first so focus changes cannot fall between the query and listener setup.
				const revision = focusRevision;
				const value = await appWindow.isFocused();
				// A late initial query must not overwrite a newer focus event.
				if (disposed || revision !== focusRevision) return;
				nativeFocused = value;
				update();
			})
			.catch(() => {});
	}
	return () => {
		disposed = true;
		window.removeEventListener("focus", onFocus);
		window.removeEventListener("blur", onBlur);
		document.removeEventListener("visibilitychange", update);
		unlistenNative?.();
	};
}

/** One shared focus/visibility subscription for the waveform and playback clock. */
function subscribeForeground(listener: (foreground: boolean) => void) {
	if (listeners.size === 0) stopObserving = observeForeground();
	listeners.add(listener);
	listener(foreground);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			stopObserving?.();
			stopObserving = undefined;
		}
	};
}

/** Display cadence by default, or a fixed foreground interval for React labels.
 * Inactive/hidden windows use at most 5 updates/sec, without a busy rAF loop. */
export function startPlaybackUpdates(
	update: (frameTime: number, foreground: boolean) => void,
	foregroundInterval?: number,
) {
	let frame: number | undefined;
	let timer: number | undefined;
	let active = true;
	let stopped = false;
	const cancel = () => {
		if (frame !== undefined) cancelAnimationFrame(frame);
		if (timer !== undefined) window.clearTimeout(timer);
		frame = undefined;
		timer = undefined;
	};
	const schedule = () => {
		if (stopped || frame !== undefined || timer !== undefined) return;
		if (active && foregroundInterval === undefined)
			frame = requestAnimationFrame(tick);
		else
			timer = window.setTimeout(
				tick,
				active ? foregroundInterval : BACKGROUND_INTERVAL,
			);
	};
	const tick = (frameTime = performance.now()) => {
		frame = undefined;
		timer = undefined;
		update(frameTime, active);
		schedule();
	};
	const unsubscribe = subscribeForeground((value) => {
		active = value;
		cancel();
		// Read the audio clock immediately on return; never replay missed frames.
		update(performance.now(), active);
		schedule();
	});
	return () => {
		if (stopped) return;
		stopped = true;
		cancel();
		unsubscribe();
	};
}
