import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { Trash2, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";

interface Song {
	id: string;
	title: string;
	artist: string;
	album?: string;
	file_path: string;
}

export const Route = createFileRoute("/library")({
	component: Library,
});

function Library() {
	const [songs, setSongs] = useState<Song[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchSongs = async () => {
		try {
			const data = await invoke<Song[]>("get_songs");
			setSongs(data);
		} catch (error) {
			console.error("Failed to fetch songs:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSongs();
	}, []);

	const handleDelete = async (id: string) => {
		try {
			await invoke("remove_song", { id });
			setSongs((prev) => prev.filter((song) => song.id !== id));
		} catch (error) {
			console.error("Failed to delete song:", error);
		}
	};

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
						) : songs.length === 0 ? (
							<div className="text-center py-12 flex flex-col items-center gap-4">
								<Music className="w-12 h-12 text-muted-foreground/30" />
								<p className="text-muted-foreground">Your library is empty.</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead>
										<tr className="border-b border-border/50">
											<th className="py-3 px-4 font-semibold">Title</th>
											<th className="py-3 px-4 font-semibold">Artist</th>
											<th className="py-3 px-4 font-semibold">Album</th>
											<th className="py-3 px-4 font-semibold text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{songs.map((song) => (
											<tr
												key={song.id}
												className="border-b border-border/20 hover:bg-muted/50 transition-colors group"
											>
												<td className="py-3 px-4 font-medium">{song.title}</td>
												<td className="py-3 px-4 text-muted-foreground">
													{song.artist}
												</td>
												<td className="py-3 px-4 text-muted-foreground italic">
													{song.album || "Unknown"}
												</td>
												<td className="py-3 px-4 text-right">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDelete(song.id)}
														className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
