import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DownloadJob } from "@/hooks/useDownload";
import { SongMetadata } from "../download/SongMetadata";
import { StatusIcon } from "../download/StatusIcon";

interface ActiveDownloadItemProps {
    download: DownloadJob;
    onRemove: (id: string) => void;
}

export function ActiveDownloadItem({ download, onRemove }: ActiveDownloadItemProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <StatusIcon status={download.status} className="animate-pulse" />
                <SongMetadata metadata={download.metadata} />
                <div className="flex items-center gap-3">
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
            <Progress value={download.progress} className="h-2" />
        </div>
    );
}
