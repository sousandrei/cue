import { motion } from "framer-motion";
import { ListOrdered } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DownloadJob } from "@/hooks/useDownload";

import { ActiveDownloadItem } from "./queue/ActiveDownloadItem";
import { QueuedDownloadList } from "./queue/QueuedDownloadList";

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
						<ActiveDownloadItem download={activeDownload} onRemove={onRemove} />
					) : (
						<div className="flex items-center gap-3 text-muted-foreground">
							<div className="bg-muted p-2 rounded-full">
								<ListOrdered className="w-5 h-5" />
							</div>
							<div className="text-sm font-medium">Next in queue...</div>
						</div>
					)}

					<QueuedDownloadList
						downloads={queuedDownloads}
						onRemove={onRemove}
						onClearQueue={onClearQueue}
					/>
				</CardContent>
			</Card>
		</motion.div>
	);
}
