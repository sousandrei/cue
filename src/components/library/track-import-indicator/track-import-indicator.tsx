import { CircleHelp, TriangleAlert } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { RekordboxTrack } from "@/lib/tauri/core/types";

interface TrackImportIndicatorProps {
	status?: RekordboxTrack["status"];
	title: string;
}

export function TrackImportIndicator({
	status,
	title,
}: TrackImportIndicatorProps) {
	if (status === "imported") return null;
	const label =
		status === "not_imported"
			? "Not imported into Rekordbox"
			: status === "ambiguous"
				? "Multiple matches in Rekordbox"
				: "Rekordbox status unavailable";
	const Icon = status === "not_imported" ? TriangleAlert : CircleHelp;
	return (
		<Tooltip content={label}>
			<button
				type="button"
				aria-label={`${label}: ${title}`}
				className={`inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${status ? "text-accent-warm" : "text-muted-foreground"}`}
			>
				<Icon aria-hidden="true" className="size-4" />
			</button>
		</Tooltip>
	);
}
