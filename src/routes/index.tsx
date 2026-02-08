import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

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
			const metadata = await fetchMetadata(currentUrl);
			if (metadata) {
				await startDownload(currentUrl, metadata);
			}
		} catch (error) {
			console.error("Failed to start download process:", error);
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

			for (const bulkUrl of urls) {
				const metadata = await fetchMetadata(bulkUrl);
				if (metadata) {
					await startDownload(bulkUrl, metadata);
				}
			}
		} catch (error) {
			console.error("Failed bulk import:", error);
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col items-center p-4 pt-12">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				<Header />

				<div className="flex flex-col gap-6">
					<DownloadQueueStatus downloads={downloads} />

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
