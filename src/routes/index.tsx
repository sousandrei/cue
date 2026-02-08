import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Music, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
	component: Index,
});

interface Download {
	id: string;
	title: string;
	progress: number;
	status: "pending" | "downloading" | "completed" | "error";
	url: string;
}

function Index() {
	const [url, setUrl] = useState("");
	const [downloads, setDownloads] = useState<Download[]>([]);

	const handleAddDownload = () => {
		if (!url.trim()) return;

		const newDownload: Download = {
			id: crypto.randomUUID(),
			title: `Fetching info for: ${url}`,
			progress: 0,
			status: "pending",
			url: url,
		};

		setDownloads((prev) => [newDownload, ...prev]);
		setUrl("");

		// Simulate download process
		simulateDownload(newDownload.id);
	};

	const simulateDownload = (id: string) => {
		// Mock steps: pending -> downloading -> progress updates -> completed
		setTimeout(() => {
			setDownloads((prev) =>
				prev.map((d) =>
					d.id === id
						? {
							...d,
							status: "downloading",
							title: d.title,
						}
						: d,
				),
			);

			let progress = 0;
			const interval = setInterval(() => {
				progress += Math.random() * 10;
				if (progress >= 100) {
					progress = 100;
					clearInterval(interval);
					setDownloads((prev) =>
						prev.map((d) =>
							d.id === id
								? {
									...d,
									progress: 100,
									status: "completed",
									title: `Downloaded: Song from ${d.url}`,
								}
								: d,
						),
					);
				} else {
					setDownloads((prev) =>
						prev.map((d) => (d.id === id ? { ...d, progress } : d)),
					);
				}
			}, 500);
		}, 1000);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleAddDownload();
		}
	};

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				{/* Header / Branding */}
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
						Synqed
					</h1>
					<p className="text-muted-foreground text-lg">
						Paste a link to start downloading
					</p>
				</div>

				{/* Input Section */}
				<div className="relative group">
					<div className="absolute -inset-0.5 bg-linear-to-r from-primary/50 to-purple-600/50 rounded-full blur opacity-30"></div>
					<div className="relative flex items-center">
						<Input
							type="text"
							placeholder="https://youtube.com/watch?v=..."
							className="h-14 pl-6 pr-14 text-lg bg-background/95 backdrop-blur-xl border-muted-foreground/20 shadow-xl rounded-full focus-visible:ring-0 focus-visible:border-primary transition-all"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
						/>
						<Button
							size="icon"
							className="absolute right-2 h-10 w-10 rounded-full transition-transform hover:scale-105 active:scale-95"
							onClick={handleAddDownload}
							disabled={!url.trim()}
						>
							<ArrowRight className="h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Downloads List */}
				<div className="space-y-4 w-full">
					<AnimatePresence mode="popLayout">
						{downloads.map((download) => (
							<motion.div
								key={download.id}
								layout
								initial={{ opacity: 0, y: 20, scale: 0.95 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, scale: 0.9 }}
								transition={{ type: "spring", stiffness: 500, damping: 30 }}
							>
								<Card className="overflow-hidden border-muted-foreground/10 bg-card/50 backdrop-blur-sm">
									<CardContent className="p-4">
										<div className="flex items-center gap-4 mb-3">
											<div
												className={`p-2 rounded-full ${download.status === "completed"
													? "bg-green-500/20 text-green-500"
													: download.status === "error"
														? "bg-destructive/20 text-destructive"
														: "bg-primary/10 text-primary"
													}`}
											>
												{download.status === "completed" ? (
													<CheckCircle2 className="w-5 h-5" />
												) : download.status === "error" ? (
													<AlertCircle className="w-5 h-5" />
												) : (
													<Music className="w-5 h-5" />
												)}
											</div>

											<div className="flex-1 min-w-0">
												<h3 className="font-medium truncate text-sm sm:text-base">
													{download.title}
												</h3>
												<p className="text-xs text-muted-foreground capitalize">
													{download.status}
												</p>
											</div>

											{download.status === "completed" ||
												download.status === "error" ? (
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-full"
													onClick={() =>
														setDownloads((prev) =>
															prev.filter((d) => d.id !== download.id),
														)
													}
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
						))}
					</AnimatePresence>

					{downloads.length === 0 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="text-center text-muted-foreground/40 text-sm py-12"
						>
							No active downloads
						</motion.div>
					)}
				</div>
			</div>
		</div>
	);
}
