import { AnimatePresence } from "framer-motion";
import { History } from "lucide-react";
import { DownloadItem } from "@/components/download-item";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { DownloadJob } from "@/hooks/useDownload";
import { cn } from "@/lib/utils";

interface DownloadListProps {
	downloads: DownloadJob[];
	removeDownload: (id: string) => void;
	onClear: () => void;
	fill?: boolean;
}

export function DownloadList({
	downloads,
	removeDownload,
	onClear,
	fill = false,
}: DownloadListProps) {
	const history = downloads.filter(
		(d) => d.status === "completed" || d.status === "error",
	);

	return (
		<div
			className={cn(
				"w-full",
				fill ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4",
			)}
		>
			<div className="flex shrink-0 items-center justify-between px-1">
				<h2 className="text-sm font-semibold text-foreground">
					Recent Activity
				</h2>
				<div className="flex items-center gap-3">
					{history.length > 0 && (
						<>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClear}
								className="h-8 px-2 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
							>
								Clear history
							</Button>
							<span className="text-xs text-muted-foreground font-mono">
								{history.length}
							</span>
						</>
					)}
				</div>
			</div>
			<div
				className={cn(
					"relative space-y-3",
					fill &&
						"min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring",
				)}
				{...(fill
					? {
							role: "region",
							"aria-label": "Recent activity history",
							tabIndex: 0,
						}
					: {})}
			>
				<AnimatePresence mode="popLayout">
					{history.map((download) => (
						<DownloadItem
							key={download.id}
							download={download}
							removeDownload={removeDownload}
						/>
					))}
				</AnimatePresence>

				{history.length === 0 && (
					<EmptyState
						className={fill ? "min-h-full py-6" : undefined}
						icon={History}
						title="No recent activity"
						description="Your download history will appear here once you start syncing songs."
					/>
				)}
			</div>
		</div>
	);
}
