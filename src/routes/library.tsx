import { createFileRoute } from "@tanstack/react-router";
import { Music, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Header } from "@/components/header";
import { createColumns } from "@/components/library/columns";
import { Player } from "@/components/library/player";
import { RekordboxConnection } from "@/components/library/rekordbox-connection";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Page } from "@/components/ui/page";
import {
	useAudioPlayer,
	useAudioPlayerSelection,
} from "@/hooks/useAudioPlayer";
import { useLibrarySongs } from "@/hooks/useLibrarySongs";

export const Route = createFileRoute("/library")({
	component: Library,
});

function ConnectedPlayer() {
	const player = useAudioPlayer();
	return (
		<Player
			{...player}
			onToggle={player.toggle}
			onSeek={player.seek}
			onSkipBar={player.skipBar}
			onVolumeChange={player.setVolume}
			onClose={player.stop}
		/>
	);
}

function Library() {
	const player = useAudioPlayerSelection();
	const [query, setQuery] = useState("");
	const {
		songs,
		loading,
		missingIds,
		rekordbox,
		refreshingRekordbox,
		refreshRekordbox,
		handleDelete,
		handleUpdateTags,
		handleSyncAll,
	} = useLibrarySongs();

	const rekordboxSupported = rekordbox?.supported === true;
	const columns = useMemo(
		() =>
			createColumns(
				handleDelete,
				handleUpdateTags,
				missingIds,
				rekordboxSupported,
				{
					songId: player.songId,
					onLoad: player.loadSong,
				},
			),
		[
			handleDelete,
			handleUpdateTags,
			missingIds,
			rekordboxSupported,
			player.songId,
			player.loadSong,
		],
	);
	const normalizedQuery = query.trim().toLocaleLowerCase();
	const filteredSongs = songs.filter((song) =>
		[song.title, song.artist, song.album, song.tags].some((value) =>
			value?.toLocaleLowerCase().includes(normalizedQuery),
		),
	);

	return (
		<Page maxWidth="lg" scrollMode="contained">
			<Header
				title="Collection"
				subtitle="Your tracks, ready for the next set."
				actionClassName="w-full md:w-auto"
				action={
					<div className="flex w-full flex-wrap items-center justify-between gap-3 md:justify-end">
						<div className="relative w-full sm:w-72">
							<Search
								className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								type="search"
								aria-label="Search collection"
								placeholder="Search tracks, artists, or tags"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								className="pl-9"
							/>
						</div>
						<div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
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
							<RekordboxConnection
								status={rekordbox}
								refreshing={refreshingRekordbox}
								onRefresh={refreshRekordbox}
							/>
						</div>
					</div>
				}
			/>
			<section
				aria-label="Music collection"
				className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
			>
				<ConnectedPlayer />
				{!loading && !songs.length ? (
					<EmptyState
						icon={Music}
						title="Your library is empty"
						description="Synced songs will appear here."
					/>
				) : (
					<DataTable
						fill
						caption="Music collection"
						columns={columns}
						data={filteredSongs}
						getRowId={(song) => song.id}
						activeRowId={player.songId}
						loading={loading}
						emptyMessage="No tracks match your search."
					/>
				)}
			</section>
		</Page>
	);
}
