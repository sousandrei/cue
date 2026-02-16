import {
	type Event,
	listen as tauriListen,
	type UnlistenFn,
} from "@tauri-apps/api/event";
import {
	type MessageDialogOptions,
	type OpenDialogOptions,
	ask as tauriAsk,
	open as tauriOpen,
} from "@tauri-apps/plugin-dialog";
import { relaunch as tauriRelaunch } from "@tauri-apps/plugin-process";
import { check as tauriCheck, type Update } from "@tauri-apps/plugin-updater";

import { isTauri } from "./env";

export async function listen<T>(
	event: string,
	handler: (event: Event<T>) => void,
): Promise<UnlistenFn> {
	if (isTauri()) {
		return await tauriListen(event, handler);
	}
	console.log(`[Mock] Listening to event: ${event}`);
	// Return a dummy unlisten function
	return () => {
		console.log(`[Mock] Unlistening to event: ${event}`);
	};
}

export async function open(
	options?: OpenDialogOptions,
): Promise<null | string | string[]> {
	if (isTauri()) {
		return await tauriOpen(options);
	}
	console.log("[Mock] Open dialog with options:", options);
	return "/mock/path/selected";
}

export async function ask(
	message: string,
	options?: MessageDialogOptions,
): Promise<boolean> {
	if (isTauri()) {
		return await tauriAsk(message, options);
	}
	console.log("[Mock] Ask dialog:", message, options);
	return true;
}

export async function relaunch() {
	if (isTauri()) {
		await tauriRelaunch();
	} else {
		console.log("[Mock] Relaunching app...");
		window.location.reload();
	}
}

export async function check() {
	if (isTauri()) {
		return await tauriCheck();
	}
	console.log("[Mock] Checking for updates...");
	return null;
}

export type { Update };
