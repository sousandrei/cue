import { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Song {
    id: string;
    title: string;
    artist: string;
    album?: string;
    filename: string;
}

export const createColumns = (handleDelete: (id: string) => void): ColumnDef<Song>[] => [
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
];
