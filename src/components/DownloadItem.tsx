import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SongMetadata } from "@/components/download/SongMetadata";
import { StatusIcon } from "@/components/download/StatusIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DownloadJob } from "@/hooks/useDownload";
import { scaleIn } from "@/lib/motion";

interface DownloadItemProps {
	download: DownloadJob;
	removeDownload: (id: string) => void;
}

export function DownloadItem({ download, removeDownload }: DownloadItemProps) {
	const [showLogs, setShowLogs] = useState(false);
	const logEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (showLogs) {
			logEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [showLogs]);

	return (
		<motion.div
			layout
			variants={scaleIn}
			initial="hidden"
			animate="visible"
			exit="hidden"
		>
			<Card className="overflow-hidden">
				<CardContent className="py-1 px-2.5">
					<div className="flex items-center gap-2">
						<StatusIcon status={download.status} size="sm" />
						<SongMetadata metadata={download.metadata} />

						{download.logs && download.logs.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								className="h-6 px-2 gap-1 rounded-md bg-glass-bg backdrop-blur-[16px] border-glass-border hover:border-primary/50 hover:bg-primary/5 transition-all"
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

						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full hover:bg-destructive/10"
							onClick={() => removeDownload(download.id)}
						>
							<X className="w-4 h-4 text-muted-foreground" />
						</Button>
					</div>

					<AnimatePresence>
						{showLogs && download.logs && download.logs.length > 0 && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								className="mt-2 overflow-hidden"
							>
								<div className="bg-card/60 rounded-md p-2 font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto border border-glass-border scrollbar-thin scrollbar-thumb-border/30">
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
				</CardContent>
			</Card>
		</motion.div>
	);
}
