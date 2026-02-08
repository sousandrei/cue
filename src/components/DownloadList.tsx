import { AnimatePresence, motion } from "framer-motion";
import type { DownloadJob } from "@/hooks/useDownload";
import { DownloadItem } from "./DownloadItem";

interface DownloadListProps {
	downloads: DownloadJob[];
	removeDownload: (id: string) => void;
}

export function DownloadList({ downloads, removeDownload }: DownloadListProps) {
	return (
		<div className="space-y-4 w-full">
			<AnimatePresence mode="popLayout">
				{downloads.map((download) => (
					<DownloadItem
						key={download.id}
						download={download}
						removeDownload={removeDownload}
					/>
				))}
			</AnimatePresence>

			{downloads.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center text-muted-foreground/40 text-sm py-12"
				>
					No active downloads
				</motion.div>
			)}
		</div>
	);
}
