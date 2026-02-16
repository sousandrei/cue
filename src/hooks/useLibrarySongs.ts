import { useCallback, useEffect, useState } from "react";

import type { Song } from "@/components/library/columns";
import { listen } from "@/lib/tauri/api";
import { getSongs, removeSong } from "@/lib/tauri/commands";

export function useLibrarySongs() {
	const [songs, setSongs] = useState<Song[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchSongs = useCallback(async () => {
		try {
			const data = await getSongs();
			setSongs(data);
		} catch (error) {
			console.error("Failed to fetch songs:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSongs();

		const unlisten = listen("library://updated", () => {
			fetchSongs();
		});

		return () => {
			unlisten.then((f) => f());
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

	return {
		songs,
		loading,
		handleDelete,
		refresh: fetchSongs,
	};
}
