import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DownloadList } from "@/components/download-list";
import { DownloadQueueStatus } from "@/components/download-queue-status";
import { IntakeLayout } from "@/components/intake-layout";
import { DownloadInput } from "@/components/ui/download-input";
import { toast } from "@/components/ui/toast";
import { useDownload } from "@/hooks/useDownload";
import { useSmartQueue } from "@/hooks/useSmartQueue";
import { useTauri } from "@/lib/tauri/TauriProvider";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const tauri = useTauri();
	const [url, setUrl] = useState("");
	const { downloads, removeDownload, clearQueue, clearHistory } = useDownload();
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
			const selected = await tauri.open({
				multiple: false,
				filters: [
					{
						name: "Text",
						extensions: ["txt"],
					},
				],
			});

			if (!selected) return;

			const content = await tauri.readFileContent(selected as string);
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
		<IntakeLayout
			input={
				<DownloadInput
					url={url}
					setUrl={setUrl}
					onAdd={handleAddDownload}
					onUpload={handleBulkImport}
					loading={loading}
				/>
			}
			queue={
				<DownloadQueueStatus
					downloads={downloads}
					onRemove={removeDownload}
					onClearQueue={clearQueue}
				/>
			}
			history={
				<DownloadList
					fill
					downloads={downloads}
					removeDownload={removeDownload}
					onClear={clearHistory}
				/>
			}
		/>
	);
}
