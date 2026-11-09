import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { TagBadge } from "@/components/library/tag-badge";
import { TagInput } from "@/components/library/tag-input";
import { TrackImportIndicator } from "@/components/library/track-import-indicator";
import { Button } from "@/components/ui/button";
import type { dataTableFeatures } from "@/components/ui/data-table";
import type { Song } from "@/lib/tauri/core/types";

export type { Song };

const TagsCell = ({
	song,
	onUpdate,
}: {
	song: Song;
	onUpdate: (id: string, tags: string) => void;
}) => {
	const [isEditing, setIsEditing] = useState(false);

	const tags = (song.tags || "")
		.split(",")
		.map((t) => t.trim())
		.filter((t) => t.length > 0);

	const handleTagsChange = (newTags: string[]) => {
		onUpdate(song.id, newTags.join(","));
	};

	if (isEditing) {
		return (
			<TagInput
				autoFocus
				tags={tags}
				onChange={handleTagsChange}
				onBlur={() => setIsEditing(false)}
			/>
		);
	}

	return (
		<Button
			variant="ghost"
			type="button"
			className="group h-auto min-h-9 w-full flex-wrap justify-start gap-1.5 whitespace-normal px-1 text-left"
			onClick={() => setIsEditing(true)}
			aria-label={`Edit tags for ${song.title}`}
		>
			{tags.length > 0 ? (
				tags.map((tag) => <TagBadge key={tag} tag={tag} />)
			) : (
				<span className="ml-1 text-xs text-muted-foreground">Add tags...</span>
			)}
			<div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1">
				<Plus className="h-3 w-3 text-muted-foreground" />
			</div>
		</Button>
	);
};

export const createColumns = (
	handleDelete: (id: string) => void,
	handleUpdateTags: (id: string, tags: string) => void,
	missingIds: Set<string>,
	rekordboxSupported = true,
	playback?: {
		songId?: string;
		onLoad: (song: Song) => void;
	},
): ColumnDef<typeof dataTableFeatures, Song>[] => {
	const columns: ColumnDef<typeof dataTableFeatures, Song>[] = [
		{
			accessorKey: "title",
			header: "Name",
			size: 220,
			minSize: 200,
			cell: ({ row }) => {
				const isMissing = missingIds.has(row.original.id);
				return (
					<div
						className={`flex items-center gap-2 font-medium ${
							isMissing ? "text-destructive/70" : "text-foreground"
						}`}
						title={
							isMissing ? "File missing locally. Use Sync to re-download." : ""
						}
					>
						{playback && (
							<Button
								variant={
									playback.songId === row.original.id ? "outline" : "ghost"
								}
								size="icon"
								className="size-8"
								disabled={isMissing}
								aria-label={`Load ${row.original.title} into player`}
								aria-pressed={playback.songId === row.original.id}
								title={
									playback.songId === row.original.id
										? "Loaded in player"
										: "Load into player"
								}
								onClick={() => {
									if (playback.songId !== row.original.id)
										playback.onLoad(row.original);
								}}
							>
								<Play aria-hidden="true" />
							</Button>
						)}
						{isMissing && <AlertCircle className="w-4 h-4 text-destructive" />}
						<span className="truncate">{row.getValue("title")}</span>
						{rekordboxSupported && (
							<TrackImportIndicator
								status={row.original.rekordbox?.status}
								title={row.original.title}
							/>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "artist",
			header: "Artist",
			size: 140,
			minSize: 120,
			cell: ({ row }) => (
				<div className="text-muted-foreground truncate">
					{row.getValue("artist")}
				</div>
			),
		},
		{
			id: "bpm",
			header: "BPM",
			size: 80,
			accessorFn: (song) => song.rekordbox?.bpm ?? undefined,
			sortFn: (left, right) =>
				(left.original.rekordbox?.bpm ?? 0) -
				(right.original.rekordbox?.bpm ?? 0),
			sortUndefined: "last",
			cell: ({ row }) => (
				<span className="tabular-nums text-muted-foreground">
					{row.original.rekordbox?.bpm?.toLocaleString(undefined, {
						maximumFractionDigits: 2,
					}) ?? "—"}
				</span>
			),
		},
		{
			id: "key",
			header: "Key",
			size: 64,
			accessorFn: (song) => song.rekordbox?.key ?? undefined,
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					{row.original.rekordbox?.key ?? "—"}
				</span>
			),
		},
		{
			accessorKey: "album",
			header: "Album",
			size: 140,
			minSize: 120,
			cell: ({ row }) => (
				<div className="text-muted-foreground italic truncate">
					{row.getValue("album") || "Unknown"}
				</div>
			),
		},
		{
			accessorKey: "tags",
			header: "Tags",
			size: 220,
			minSize: 200,
			cell: ({ row }) => (
				<TagsCell song={row.original} onUpdate={handleUpdateTags} />
			),
		},
		{
			id: "actions",
			enableSorting: false,
			header: () => <div className="text-right">Actions</div>,
			size: 64,
			cell: ({ row }) => (
				<div className="text-right">
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Remove ${row.original.title}`}
						onClick={() => handleDelete(row.original.id)}
						className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			),
		},
	];
	return rekordboxSupported
		? columns
		: columns.filter((column) => column.id !== "bpm" && column.id !== "key");
};
