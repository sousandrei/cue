import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, ListOrdered, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";
import { SongMetadata } from "./download/SongMetadata";
import { StatusIcon } from "./download/StatusIcon";

interface DownloadQueueStatusProps {
	downloads: DownloadJob[];
	onRemove: (id: string) => void;
	onClearQueue: () => void;
}

export function DownloadQueueStatus({
	downloads,
	onRemove,
	onClearQueue,
}: DownloadQueueStatusProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const activeDownload = downloads.find(
		(d) => d.status === "pending" || d.status === "downloading",
	);
	const queuedDownloads = downloads.filter((d) => d.status === "queued");

	if (!activeDownload && queuedDownloads.length === 0) {
		return null;
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			className="w-full"
		>
			<Card className="border-primary/20 bg-primary/5 backdrop-blur-xl shadow-2xl overflow-hidden">
				<CardContent className="p-4">
					{activeDownload ? (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<StatusIcon
									status={activeDownload.status}
									className="animate-pulse"
								/>
								<SongMetadata metadata={activeDownload.metadata} />
								<div className="flex items-center gap-3">
									<div className="text-base font-mono font-black text-primary tracking-tighter">
										{Math.round(activeDownload.progress)}%
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
										onClick={() => onRemove(activeDownload.id)}
									>
										<X className="w-4 h-4" />
									</Button>
								</div>
							</div>
							<Progress value={activeDownload.progress} className="h-2" />
						</div>
					) : (
						<div className="flex items-center gap-3 text-muted-foreground">
							<div className="bg-muted p-2 rounded-full">
								<ListOrdered className="w-5 h-5" />
							</div>
							<div className="text-sm font-medium">Next in queue...</div>
						</div>
					)}

					{queuedDownloads.length > 0 && (
						<div className="flex flex-col">
							<div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/10">
								<Button
									variant="ghost"
									size="sm"
									className="flex-1 flex justify-between h-8 hover:bg-primary/10"
									onClick={() => setIsExpanded(!isExpanded)}
								>
									<span className="text-xs font-semibold">
										Queue ({queuedDownloads.length})
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
										{queuedDownloads.map((job) => (
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
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
