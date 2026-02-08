import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { downloadAudio, DownloadProgressPayload, DownloadErrorPayload } from '@/lib/tauri-commands';

export interface DownloadJob {
    id: string;
    title: string;
    progress: number;
    status: "pending" | "downloading" | "completed" | "error";
    url: string;
}

export function useDownload() {
    const [downloads, setDownloads] = useState<DownloadJob[]>([]);

    useEffect(() => {
        const unlistenProgress = listen('download://progress', (event) => {
            const payload = event.payload as DownloadProgressPayload;
            setDownloads(prev => prev.map(d => {
                if (d.id === payload.id) {
                    return {
                        ...d,
                        progress: payload.progress,
                        status: payload.status,
                    };
                }
                return d;
            }));
        });

        const unlistenError = listen('download://error', (event) => {
            const payload = event.payload as DownloadErrorPayload;
            setDownloads(prev => prev.map(d => {
                if (d.id === payload.id) {
                    return {
                        ...d,
                        status: 'error',
                        title: `Error: ${payload.error}`
                    };
                }
                return d;
            }));
        });

        return () => {
            unlistenProgress.then(f => f());
            unlistenError.then(f => f());
        };
    }, []);

    const startDownload = useCallback(async (url: string, metadata: any) => {
        const id = crypto.randomUUID();
        const title = `${metadata.artist} - ${metadata.title}`;
        const newDownload: DownloadJob = {
            id,
            title,
            progress: 0,
            status: "pending",
            url: url,
        };

        setDownloads((prev) => [newDownload, ...prev]);

        try {
            await downloadAudio(url, id, metadata);
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            console.error("Failed to start download:", error);
            setDownloads(prev => prev.map(d =>
                d.id === id ? { ...d, status: 'error', title: `Failed to start: ${error}` } : d
            ));
        }
    }, []);

    const removeDownload = useCallback((id: string) => {
        setDownloads(prev => prev.filter(d => d.id !== id));
    }, []);

    return {
        downloads,
        startDownload,
        removeDownload,
    };
}
