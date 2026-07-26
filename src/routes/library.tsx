import { createFileRoute } from "@tanstack/react-router";
import { Disc3, Loader2, Music, RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { createColumns } from "@/components/library/columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Page } from "@/components/ui/page";
import { useLibrarySongs } from "@/hooks/useLibrarySongs";

export const Route = createFileRoute("/library")({
	component: Library,
});

function Library() {
	const {
		songs,
		loading,
		missingIds,
		handleDelete,
		handleUpdateTags,
		handleSyncAll,
	} = useLibrarySongs();

	const columns = useMemo(
		() => createColumns(handleDelete, handleUpdateTags, missingIds),
		[handleDelete, handleUpdateTags, missingIds],
	);

	return (
		<Page maxWidth="lg">
			<Header />

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Disc3 className="w-5 h-5 text-primary" />
							Collection
						</CardTitle>
						{missingIds.size > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleSyncAll}
								className="flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4" />
								Sync
								<span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-1.5 py-0.5">
									{missingIds.size}
								</span>
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-primary" />
						</div>
					) : !songs.length ? (
						<EmptyState
							icon={Music}
							title="Your library is empty"
							description="Synced songs will appear here."
						/>
					) : (
						<DataTable columns={columns} data={songs} />
					)}
				</CardContent>
			</Card>
		</Page>
	);
}
