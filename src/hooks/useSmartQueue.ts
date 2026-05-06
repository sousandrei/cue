import { useDownload } from "@/hooks/useDownload";
import { useMetadata } from "@/hooks/useMetadata";
import { useTauri } from "@/lib/tauri/TauriProvider";
import type { MetadataPayload } from "@/lib/tauri/core/types";

export function useSmartQueue() {
	const tauri = useTauri();
	const { downloads, startDownload } = useDownload();
	const { fetchMetadata, loading } = useMetadata();

	const queueUrl = async (url: string) => {
		const added: MetadataPayload[] = [];
		let skipped = 0;

		try {
			const metadataList = await fetchMetadata(url);
			if (!metadataList || metadataList.length === 0) {
				return { added, skipped, error: null };
			}

			// First pass: identify what needs to be downloaded
			const toQueue: MetadataPayload[] = [];
			for (const metadata of metadataList) {
				const isQueued = downloads.some((d) => d.id === metadata.id);
				const existingSong = await tauri.getSongById(metadata.id);

				if (isQueued || existingSong) {
					skipped++;
					continue;
				}
				toQueue.push(metadata);
			}

			// Second pass: start downloads
			for (const metadata of toQueue) {
				await startDownload(metadata.url, metadata);
				added.push(metadata);
			}

			return { added, skipped, error: null };
		} catch (error) {
			return { added, skipped, error };
		}
	};

	return {
		queueUrl,
		loading,
	};
}
