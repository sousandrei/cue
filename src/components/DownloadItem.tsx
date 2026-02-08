import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";

interface DownloadItemProps {
	download: DownloadJob;
	removeDownload: (id: string) => void;
}

export function DownloadItem({ download, removeDownload }: DownloadItemProps) {
	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={{ type: "spring", stiffness: 500, damping: 30 }}
		>
			<Card className="overflow-hidden border-muted-foreground/10 bg-card/50 backdrop-blur-sm">
				<CardContent className="py-2.5 px-3">
					<div className="flex items-center gap-3">
						<div
							className={`p-1.5 rounded-full shrink-0 ${
								download.status === "completed"
									? "bg-green-500/20 text-green-500"
									: download.status === "error"
										? "bg-destructive/20 text-destructive"
										: "bg-primary/10 text-primary"
							}`}
						>
							{download.status === "completed" ? (
								<CheckCircle2 className="w-4 h-4" />
							) : download.status === "error" ? (
								<AlertCircle className="w-4 h-4" />
							) : (
								<Music className="w-4 h-4" />
							)}
						</div>

						<div className="flex-1 min-w-0">
							<h3 className="font-bold truncate text-sm sm:text-[15px] leading-tight">
								{download.metadata.title}
							</h3>
							<p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
								<span className="font-medium text-muted-foreground/80">
									{download.metadata.artist}
								</span>
								{download.metadata.album && (
									<>
										<span className="mx-1 opacity-40">•</span>
										<span>{download.metadata.album}</span>
									</>
								)}
							</p>
						</div>

						{download.status === "completed" || download.status === "error" ? (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={() => removeDownload(download.id)}
							>
								<X className="w-4 h-4" />
							</Button>
						) : (
							<div className="text-xs font-mono font-medium text-muted-foreground">
								{Math.round(download.progress)}%
							</div>
						)}
					</div>

					{(download.status === "pending" ||
						download.status === "downloading") && (
						<Progress value={download.progress} className="h-1.5" />
					)}
				</CardContent>
			</Card>
		</motion.div>
	);
}
