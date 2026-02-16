import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useState } from "react";
import { SongMetadata } from "@/components/download/SongMetadata";
import { Button } from "@/components/ui/button";
import type { DownloadJob } from "@/hooks/useDownload";

interface QueuedDownloadListProps {
	downloads: DownloadJob[];
	onRemove: (id: string) => void;
	onClearQueue: () => void;
}

export function QueuedDownloadList({
	downloads,
	onRemove,
	onClearQueue,
}: QueuedDownloadListProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (downloads.length === 0) return null;

	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/10">
				<Button
					variant="ghost"
					size="sm"
					className="flex-1 flex justify-between h-8 hover:bg-primary/10"
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<span className="text-xs font-semibold">
						Queue ({downloads.length})
					</span>
					{isExpanded ? (
						<ChevronUp className="w-4 h-4 ml-2" />
					) : (
						<ChevronDown className="w-4 h-4 ml-2" />
					)}
				</Button>
				{isExpanded && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-3 text-xs font-medium hover:text-destructive hover:bg-destructive/10"
						onClick={onClearQueue}
					>
						Clear Queue
					</Button>
				)}
			</div>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden mt-2 space-y-2"
					>
						{downloads.map((job) => (
							<div
								key={job.id}
								className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-muted-foreground/5"
							>
								<SongMetadata metadata={job.metadata} size="sm" />
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
									onClick={() => onRemove(job.id)}
								>
									<X className="w-3 h-3" />
								</Button>
							</div>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
