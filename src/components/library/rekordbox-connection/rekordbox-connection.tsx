import { ChevronDown, Info, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import type { RekordboxStatus } from "@/lib/tauri/core/types";

interface RekordboxConnectionProps {
	status: RekordboxStatus | null;
	refreshing: boolean;
	onRefresh: () => void;
}

export function RekordboxConnection({
	status,
	refreshing,
	onRefresh,
}: RekordboxConnectionProps) {
	if (!status?.supported) return null;
	const imported =
		status?.tracks.filter((track) => track.status === "imported").length ?? 0;
	const missing =
		status?.tracks.filter((track) => track.status === "not_imported").length ??
		0;
	const ambiguous =
		status?.tracks.filter((track) => track.status === "ambiguous").length ?? 0;
	const syncing = status?.sync_state === "syncing";
	const reading = refreshing || status?.sync_state === "reading";
	const busy = reading || syncing;
	const dot = !status?.available
		? "bg-muted-foreground"
		: missing || ambiguous
			? "bg-accent-warm"
			: "bg-accent-cool";
	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button variant="ghost" size="sm" className="group min-w-36 gap-2" />
				}
				aria-label="Rekordbox connection details"
			>
				{busy ? (
					<Loader2
						className="size-3 animate-spin text-primary"
						aria-hidden="true"
					/>
				) : (
					<span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
				)}
				<span role="status" aria-live="polite">
					{syncing ? "Syncing…" : reading ? "Refreshing…" : "Rekordbox"}
				</span>
				<ChevronDown
					aria-hidden="true"
					className="size-3 opacity-60 transition-transform duration-150 group-data-popup-open:rotate-180"
				/>
			</PopoverTrigger>
			<PopoverContent align="end" className="space-y-3">
				<div className="space-y-1">
					<div className="flex items-center justify-between gap-2">
						<PopoverTitle>Rekordbox</PopoverTitle>
						<Tooltip content="Cue refreshes when Rekordbox saves changes. Playlist updates wait until Rekordbox is closed to avoid conflicts. Close Rekordbox to apply pending tags, then reopen it to see the updated playlists. Refresh checks again manually.">
							<button
								type="button"
								aria-label="How automatic Rekordbox sync works"
								className="inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
							>
								<Info className="size-3.5" aria-hidden="true" />
							</button>
						</Tooltip>
					</div>
					<PopoverDescription>
						{status?.available
							? "Tags mirror playlists in the Cue folder. Sync removes tracks without the matching tag."
							: "The local library could not be read. Refresh to try again."}
					</PopoverDescription>
				</div>
				<div className="space-y-2 text-xs">
					<p className="text-foreground">
						{status?.available
							? `${imported} imported · ${missing} not imported${ambiguous ? ` · ${ambiguous} to review` : ""}`
							: "Connection unavailable"}
					</p>
					{status?.available && !busy && (
						<p className="leading-relaxed text-muted-foreground">
							{status.sync_state === "pending"
								? status.running
									? "Changes pending · close Rekordbox to apply."
									: "Changes pending · waiting for the library to settle."
								: status.sync_state === "error"
									? "Sync needs attention. Refresh to retry."
									: status.sync_state === "synced"
										? "Up to date"
										: "Automatic sync starting…"}
						</p>
					)}
					{status?.sync_error && (
						<p className="break-words leading-relaxed text-accent-warm">
							{status.sync_error}
						</p>
					)}
					{status?.available && status.watching === false && (
						<p className="leading-relaxed text-muted-foreground">
							Checking periodically · live file watching unavailable.
						</p>
					)}
				</div>
				<div className="flex justify-end pt-1">
					<Button
						variant="ghost"
						size="sm"
						disabled={busy}
						onClick={onRefresh}
						aria-label="Refresh Rekordbox library"
					>
						<RefreshCw aria-hidden="true" />
						Refresh
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
