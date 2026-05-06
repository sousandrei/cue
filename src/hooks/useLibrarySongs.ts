import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Song } from "@/components/library/columns";
import { listen } from "@/lib/tauri/api";
import {
	checkMissingSongs,
	getDownloads,
	getSongs,
	removeSong,
	syncSong,
} from "@/lib/tauri/commands";

const ACTIVE_STATUSES = new Set(["queued", "pending", "downloading"]);

export function useLibrarySongs() {
	const [songs, setSongs] = useState<Song[]>([]);
	const [loading, setLoading] = useState(true);
	const [missingIds, setMissingIds] = useState<Set<string>>(new Set());

	const fetchSongs = useCallback(async () => {
		try {
			const [data, missing, downloads] = await Promise.all([
				getSongs(),
				checkMissingSongs(),
				getDownloads(),
			]);

			setSongs(data);

			const activeIds = new Set(
				downloads.filter((d) => ACTIVE_STATUSES.has(d.status)).map((d) => d.id),
			);

			setMissingIds(new Set(missing.filter((id) => !activeIds.has(id))));
		} catch (error) {
			console.error("Failed to fetch songs:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSongs();

		const unlistenLibrary = listen("library://updated", () => {
			fetchSongs();
		});

		const unlistenDownloads = listen("download://list-updated", () => {
			fetchSongs();
		});

		return () => {
			unlistenLibrary.then((f) => f());
			unlistenDownloads.then((f) => f());
		};
	}, [fetchSongs]);

	const handleDelete = useCallback(async (id: string) => {
		try {
			await removeSong(id);
			setSongs((prev) => prev.filter((song) => song.id !== id));
		} catch (error) {
			console.error("Failed to delete song:", error);
		}
	}, []);

	const handleSyncAll = useCallback(async () => {
		if (missingIds.size === 0) return;

		const toSync = songs.filter((s) => missingIds.has(s.id));
		const withUrl = toSync.filter((s) => s.source_url);
		const withoutUrl = toSync.filter((s) => !s.source_url);

		if (withoutUrl.length > 0) {
			toast.warning(
				`${withoutUrl.length} song${withoutUrl.length > 1 ? "s" : ""} missing source URL and cannot be synced.`,
			);
		}

		if (withUrl.length === 0) return;

		try {
			await Promise.all(withUrl.map((s) => syncSong(s.id)));
			toast.success(
				`${withUrl.length} song${withUrl.length > 1 ? "s" : ""} re-queued for download`,
			);
		} catch (error) {
			console.error("Failed to sync songs:", error);
			toast.error("Failed to sync some songs");
		}
	}, [missingIds, songs]);

	return {
		songs,
		loading,
		missingIds,
		handleDelete,
		handleSyncAll,
		refresh: fetchSongs,
	};
}
