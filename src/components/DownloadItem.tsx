import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";
import { SongMetadata } from "./download/SongMetadata";
import { StatusIcon } from "./download/StatusIcon";

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
			<Card className="overflow-hidden border-muted-foreground/5 bg-card/30 backdrop-blur-sm">
				<CardContent className="py-1 px-2.5">
					<div className="flex items-center gap-2">
						<StatusIcon status={download.status} size="sm" />
						<SongMetadata metadata={download.metadata} />

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
