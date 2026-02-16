import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SongMetadata } from "@/components/download/SongMetadata";
import { StatusIcon } from "@/components/download/StatusIcon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";

interface ActiveDownloadItemProps {
	download: DownloadJob;
	onRemove: (id: string) => void;
}

export function ActiveDownloadItem({
	download,
	onRemove,
}: ActiveDownloadItemProps) {
	const [showLogs, setShowLogs] = useState(false);
	const logEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (showLogs) {
			logEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [showLogs]);

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<StatusIcon status={download.status} className="animate-pulse" />
				<SongMetadata metadata={download.metadata} />
				<div className="flex items-center gap-3 ml-auto">
					<div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mr-2">
						{download.detailed_status || "Downloading..."}
					</div>
					{download.logs && download.logs.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							className="h-8 px-2 gap-1 rounded-md bg-white/5 border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all"
							onClick={() => setShowLogs(!showLogs)}
						>
							<span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
								Logs
							</span>
							{showLogs ? (
								<ChevronUp className="w-3.5 h-3.5 text-primary" />
							) : (
								<ChevronDown className="w-3.5 h-3.5 text-primary" />
							)}
						</Button>
					)}
					<div className="text-base font-mono font-black text-primary tracking-tighter">
						{Math.round(download.progress)}%
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
						onClick={() => onRemove(download.id)}
					>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>
			<div className="space-y-2">
				<Progress value={download.progress} className="h-2" />
				<AnimatePresence>
					{showLogs && download.logs && download.logs.length > 0 && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="overflow-hidden"
						>
							<div className="bg-black/40 rounded-md p-2 font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto border border-white/5 scrollbar-thin scrollbar-thumb-white/10 mt-2">
								{download.logs.map((log, i) => (
									<div
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
		</div>
	);
}
