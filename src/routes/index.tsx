import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { DownloadInput } from "@/components/DownloadInput";
import { DownloadList } from "@/components/DownloadList";
import { DownloadQueueStatus } from "@/components/DownloadQueueStatus";
import { Header } from "@/components/Header";
import { useDownload } from "@/hooks/useDownload";
import { useMetadata } from "@/hooks/useMetadata";
import { readFileContent } from "@/lib/tauri-commands";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const [url, setUrl] = useState("");
	const { downloads, startDownload, removeDownload } = useDownload();
	const { fetchMetadata, loading } = useMetadata();

	const handleAddDownload = async () => {
		if (!url.trim() || loading) return;

		const currentUrl = url.trim();
		setUrl("");

		try {
			const metadataList = await fetchMetadata(currentUrl);
			if (metadataList && metadataList.length > 0) {
				for (const metadata of metadataList) {
					await startDownload(metadata.url, metadata);
				}
				toast.success(
					metadataList.length > 1
						? `Added ${metadataList.length} songs to queue`
						: "Added to queue",
				);
			}
		} catch (error) {
			console.error("Failed to start download process:", error);
			toast.error(`Failed to fetch metadata: ${error}`);
		}
	};

	const handleBulkImport = async () => {
		try {
			const selected = await open({
				multiple: false,
				filters: [
					{
						name: "Text",
						extensions: ["txt"],
					},
				],
			});

			if (!selected) return;

			toast.loading("Reading file...", { id: "bulk-import" });
			const content = await readFileContent(selected as string);
			const urls = content
				.split("\n")
				.map((u) => u.trim())
				.filter(
					(u) => u.length > 0 && (u.startsWith("http") || u.startsWith("www")),
				);

			if (urls.length === 0) {
				toast.error("No valid URLs found in file", { id: "bulk-import" });
				return;
			}

			toast.success(`Importing ${urls.length} songs...`, { id: "bulk-import" });

			let failCount = 0;

			for (const bulkUrl of urls) {
				try {
					const metadataList = await fetchMetadata(bulkUrl);
					if (metadataList && metadataList.length > 0) {
						for (const metadata of metadataList) {
							await startDownload(metadata.url, metadata);
						}
					} else {
						failCount++;
					}
				} catch (e) {
					failCount++;
					console.error(`Failed to import ${bulkUrl}:`, e);
				}
			}

			if (failCount > 0) {
				toast.error(`Import finished with ${failCount} errors`);
			}
		} catch (error) {
			console.error("Failed bulk import:", error);
			toast.error(`Bulk import failed: ${error}`, { id: "bulk-import" });
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col items-center p-4 pt-12">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				<Header />

				<div className="flex flex-col gap-6">
					<DownloadQueueStatus
						downloads={downloads}
						onRemove={removeDownload}
					/>

					<DownloadInput
						url={url}
						setUrl={setUrl}
						onAdd={handleAddDownload}
						onUpload={handleBulkImport}
						loading={loading}
					/>
				</div>

				<div className="mt-4">
					<DownloadList downloads={downloads} removeDownload={removeDownload} />
				</div>
			</div>
		</div>
	);
}
