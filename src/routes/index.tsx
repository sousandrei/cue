import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { DownloadInput } from "@/components/DownloadInput";
import { DownloadQueueStatus } from "@/components/DownloadQueueStatus";
import { Header } from "@/components/Header";
import { useDownload } from "@/hooks/useDownload";
import { useSmartQueue } from "@/hooks/useSmartQueue";
import { readFileContent } from "@/lib/tauri-commands";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const [url, setUrl] = useState("");
	const { downloads, removeDownload, clearQueue } = useDownload();
	const { queueUrl, loading } = useSmartQueue();

	const handleAddDownload = async () => {
		if (!url.trim() || loading) return;

		const currentUrl = url.trim();
		setUrl("");

		const { added, skipped, error } = await queueUrl(currentUrl);

		if (error) {
			console.error("Failed to start download process:", error);
			toast.error(`Failed to execute: ${error}`);
			return;
		}

		if (skipped > 0) {
			toast.info(
				added.length === 0
					? "Already in library or queue"
					: `${skipped} items skipped (already in library)`,
			);
		}

		if (added.length > 0) {
			toast.success(
				added.length > 1
					? `Added ${added.length} songs to queue`
					: "Added to queue",
			);
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

			let processedCount = 0;
			let totalSkipped = 0;
			let failCount = 0;

			for (const bulkUrl of urls) {
				const { skipped, error } = await queueUrl(bulkUrl);

				if (error) {
					failCount++;
					console.error(`Failed to import ${bulkUrl}:`, error);
				} else {
					totalSkipped += skipped;
				}
				processedCount++;
			}

			if (totalSkipped > 0) {
				toast.info(`${totalSkipped} songs skipped (already in library)`, {
					id: "bulk-import-skip",
				});
			}

			if (failCount > 0) {
				toast.error(`Import finished with ${failCount} errors`);
			} else {
				toast.success(`Successfully processed ${processedCount} URLs`, {
					id: "bulk-import",
				});
			}
		} catch (error) {
			console.error("Failed bulk import:", error);
			toast.error(`Bulk import failed: ${error}`, { id: "bulk-import" });
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-2xl flex flex-col gap-12 -mt-20">
				<Header />

				<div className="flex flex-col gap-8">
					<DownloadInput
						url={url}
						setUrl={setUrl}
						onAdd={handleAddDownload}
						onUpload={handleBulkImport}
						loading={loading}
					/>

					<DownloadQueueStatus
						downloads={downloads}
						onRemove={removeDownload}
						onClearQueue={clearQueue}
					/>
				</div>
			</div>
		</div>
	);
}
