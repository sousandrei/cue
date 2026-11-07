import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { SongMetadata } from "@/components/download/song-metadata";
import { StatusIcon } from "@/components/download/status-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";
import { fade } from "@/lib/motion";

interface ActiveDownloadItemProps {
	download: DownloadJob;
	onRemove: (id: string) => void;
}

export function ActiveDownloadItem({
	download,
	onRemove,
}: ActiveDownloadItemProps) {
	const [showLogs, setShowLogs] = useState(false);
	const logsId = useId();
	const logEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (showLogs) {
			logEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [showLogs]);

	return (
		<motion.div
			variants={fade}
			initial="hidden"
			animate="visible"
			className="space-y-4"
		>
			<div className="flex flex-wrap items-center gap-3">
				<StatusIcon status={download.status} />
				<SongMetadata metadata={download.metadata} />
				<div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
					<div className="mr-auto text-xs text-muted-foreground sm:mr-1">
						{download.detailed_status || "Downloading..."}
					</div>
					<div className="text-sm font-semibold tabular-nums text-primary">
						{Math.round(download.progress)}%
					</div>
					{download.logs && download.logs.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 px-2 gap-1 rounded-md bg-glass-bg backdrop-blur-[16px] border-glass-border hover:border-primary/50 hover:bg-primary/5 transition-all"
							onClick={() => setShowLogs(!showLogs)}
							aria-expanded={showLogs}
							aria-controls={showLogs ? logsId : undefined}
						>
							<span className="text-xs font-medium">Logs</span>
							{showLogs ? (
								<ChevronUp className="w-3.5 h-3.5 text-primary" />
							) : (
								<ChevronDown className="w-3.5 h-3.5 text-primary" />
							)}
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
						onClick={() => onRemove(download.id)}
						aria-label={`Cancel ${download.metadata.title}`}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>
			<div className="space-y-2">
				<Progress
					value={download.progress}
					className="h-2"
					aria-label={`Downloading ${download.metadata.title}`}
				/>
				<AnimatePresence>
					{showLogs && download.logs && download.logs.length > 0 && (
						<motion.div
							id={logsId}
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="overflow-hidden"
						>
							<div className="bg-card/60 rounded-md p-2 font-mono text-xs leading-relaxed max-h-40 overflow-y-auto border border-glass-border scrollbar-thin scrollbar-thumb-border/30 mt-2">
								{download.logs.map((log, i) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: logs are an append-only stream without stable IDs
										key={`${download.id}-log-${i}`}
										className="text-muted-foreground break-all"
									>
										<span className="text-primary/50 mr-2">[{i + 1}]</span>
										{log}
									</div>
								))}
								<div ref={logEndRef} />
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}
