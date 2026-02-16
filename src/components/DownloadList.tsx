import { AnimatePresence } from "framer-motion";
import { History } from "lucide-react";
import { DownloadItem } from "@/components/DownloadItem";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import type { DownloadJob } from "@/hooks/useDownload";

interface DownloadListProps {
	downloads: DownloadJob[];
	removeDownload: (id: string) => void;
	onClear: () => void;
}

export function DownloadList({
	downloads,
	removeDownload,
	onClear,
}: DownloadListProps) {
	const history = downloads.filter(
		(d) => d.status === "completed" || d.status === "error",
	);

	return (
		<div className="space-y-4 w-full">
			<div className="flex items-center justify-between px-1">
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
					Recent Activity
				</h2>
				<div className="flex items-center gap-3">
					{history.length > 0 && (
						<>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClear}
								className="h-8 px-2 text-xs text-muted-foreground/60 hover:text-primary transition-colors font-medium"
							>
								Clear history
							</Button>
							<span className="text-xs text-muted-foreground/40 font-mono">
								{history.length}
							</span>
						</>
					)}
				</div>
			</div>
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
					icon={History}
					title="No recent activity"
					description="Your download history will appear here once you start syncing songs."
				/>
			)}
		</div>
	);
}
