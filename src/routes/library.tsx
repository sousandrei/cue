import { createFileRoute } from "@tanstack/react-router";
import { Disc3, Loader2, Music } from "lucide-react";
import { useMemo } from "react";
import { Header } from "@/components/Header";
import { createColumns } from "@/components/library/columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { useLibrarySongs } from "@/hooks/useLibrarySongs";

export const Route = createFileRoute("/library")({
	component: Library,
});

function Library() {
	const { songs, loading, handleDelete } = useLibrarySongs();

	const columns = useMemo(() => createColumns(handleDelete), [handleDelete]);

	return (
		<div className="min-h-screen bg-background flex flex-col items-center p-4 pt-28 pb-28">
			<div className="w-full max-w-4xl flex flex-col gap-8">
				<Header />

				<Card className="border-none bg-card/50 backdrop-blur-sm shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
							<Disc3 className="w-6 h-6 text-primary" />
							Collection
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
