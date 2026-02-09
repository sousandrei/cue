import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { Song } from "@/components/library/columns";

export function useLibrarySongs() {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSongs = useCallback(async () => {
        try {
            const data = await invoke<Song[]>("get_songs");
            setSongs(data);
        } catch (error) {
            console.error("Failed to fetch songs:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSongs();
    }, [fetchSongs]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await invoke("remove_song", { id });
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
