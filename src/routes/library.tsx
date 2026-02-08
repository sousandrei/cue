import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Music, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";

interface Song {
	id: string;
	title: string;
	artist: string;
	album?: string;
	filename: string;
}

export const Route = createFileRoute("/library")({
	component: Library,
});

function Library() {
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

	const columns = useMemo<ColumnDef<Song>[]>(
		() => [
			{
				accessorKey: "title",
				header: "Title",
				cell: ({ row }) => (
					<div className="font-medium">{row.getValue("title")}</div>
				),
			},
			{
				accessorKey: "artist",
				header: "Artist",
				cell: ({ row }) => (
					<div className="text-muted-foreground">{row.getValue("artist")}</div>
				),
			},
			{
				accessorKey: "album",
				header: "Album",
				cell: ({ row }) => (
					<div className="text-muted-foreground italic">
						{row.getValue("album") || "Unknown"}
					</div>
				),
			},
			{
				id: "actions",
				header: () => <div className="text-right">Actions</div>,
				cell: ({ row }) => (
					<div className="text-right">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => handleDelete(row.original.id)}
							className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
						>
							<Trash2 className="w-4 h-4" />
						</Button>
					</div>
				),
			},
		],
		[handleDelete],
	);

	return (
		<div className="min-h-screen bg-background flex flex-col items-center p-4">
			<div className="w-full max-w-4xl flex flex-col gap-8">
				<Header />

				<Card className="border-none bg-card/50 backdrop-blur-md shadow-2xl">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-2xl">
							<Music className="w-6 h-6 text-primary" />
							Library
						</CardTitle>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-primary" />
							</div>
						) : !songs.length ? (
							<div className="text-center py-12 flex flex-col items-center gap-4">
								<Music className="w-12 h-12 text-muted-foreground/30" />
								<p className="text-muted-foreground">Your library is empty.</p>
							</div>
						) : (
							<DataTable columns={columns} data={songs} />
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
