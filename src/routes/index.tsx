import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DownloadInput } from "@/components/DownloadInput";
import { DownloadList } from "@/components/DownloadList";
import { Header } from "@/components/Header";
import { useDownload } from "@/hooks/useDownload";
import { useMetadata } from "@/hooks/useMetadata";

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

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				<Header />
				<DownloadInput
					url={url}
					setUrl={setUrl}
					onAdd={handleAddDownload}
					loading={loading}
				/>
				<DownloadList downloads={downloads} removeDownload={removeDownload} />
			</div>
		</div>
	);
}
