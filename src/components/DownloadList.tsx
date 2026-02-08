import { AnimatePresence, motion } from "framer-motion";
import type { DownloadJob } from "@/hooks/useDownload";
import { DownloadItem } from "./DownloadItem";

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
							<button
								type="button"
								onClick={onClear}
								className="text-xs text-muted-foreground/60 hover:text-primary transition-colors font-medium"
							>
								Clear history
							</button>
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
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-center text-muted-foreground/40 text-sm py-12 border-2 border-dashed border-muted-foreground/10 rounded-2xl"
				>
					No download history
				</motion.div>
			)}
		</div>
	);
}
