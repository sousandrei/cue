import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { TagBadge } from "@/components/library/TagBadge";
import { TagInput } from "@/components/library/TagInput";
import { Button } from "@/components/ui/button";
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
		<button
			type="button"
			className="flex flex-wrap gap-1.5 items-center w-full min-h-[36px] group cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20 rounded-md text-left transition-all hover:bg-muted/30 px-1"
			onClick={() => setIsEditing(true)}
			aria-label="Edit tags"
		>
			{tags.length > 0 ? (
				tags.map((tag) => <TagBadge key={tag} tag={tag} />)
			) : (
				<span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1">
					Add tags...
				</span>
			)}
			<div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1">
				<Plus className="h-3 w-3 text-muted-foreground" />
			</div>
		</button>
	);
};

export const createColumns = (
	handleDelete: (id: string) => void,
	handleUpdateTags: (id: string, tags: string) => void,
	missingIds: Set<string>,
): ColumnDef<Song>[] => [
	{
		accessorKey: "title",
		header: "Name",
		size: 250,
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
					{isMissing && <AlertCircle className="w-4 h-4 text-destructive" />}
					<span className="truncate">{row.getValue("title")}</span>
				</div>
			);
		},
	},
	{
		accessorKey: "artist",
		header: "Artist",
		size: 150,
		minSize: 120,
		cell: ({ row }) => (
			<div className="text-muted-foreground truncate">
				{row.getValue("artist")}
			</div>
		),
	},
	{
		accessorKey: "album",
		header: "Album",
		size: 150,
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
		size: 250,
		minSize: 200,
		cell: ({ row }) => (
			<TagsCell song={row.original} onUpdate={handleUpdateTags} />
		),
	},
	{
		id: "actions",
		header: () => <div className="text-right">Actions</div>,
		size: 80,
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
];
