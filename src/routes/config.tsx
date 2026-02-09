import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { FolderPicker } from "@/components/FolderPicker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Config {
	library_path: string;
	yt_dlp_version: string;
	auto_update: boolean;
}

export const Route = createFileRoute("/config")({
	component: ConfigPage,
});

function ConfigPage() {
	const [config, setConfig] = useState<Config | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const fetchConfig = async () => {
			try {
				const data = await invoke<Config>("get_config");
				setConfig(data);
			} catch (error) {
				console.error("Failed to fetch config:", error);
				toast.error(`Failed to load config: ${error}`);
			} finally {
				setLoading(false);
			}
		};
		fetchConfig();
	}, []);

	const handleCheckUpdate = async () => {
		try {
			toast.loading("Checking for updates...", { id: "manual-check" });
			const update = await check();
			toast.dismiss("manual-check");

			if (!update) {
				toast.info("You are up to date!");
				return;
			}

			toast.info(`Update Available: ${update.version}`, {
				description: `A new version is available.\n${update.body}`,
				action: {
					label: "Update Now",
					onClick: async () => {
						try {
							await update.downloadAndInstall((event) => {
								switch (event.event) {
									case "Started":
										toast.loading("Downloading update...", {
											id: "update-download",
										});
										break;
									case "Finished":
										toast.dismiss("update-download");
										toast.success("Update downloaded. Restarting...");
										break;
								}
							});

							await import("@tauri-apps/plugin-process").then(({ relaunch }) =>
								relaunch(),
							);
						} catch (e) {
							toast.error("Failed to update", { description: String(e) });
						}
					},
				},
				duration: Infinity,
			});
		} catch (error) {
			console.error("Failed to check for updates:", error);
			toast.error(`Failed to check for updates: ${error}`, {
				id: "manual-check",
			});
		}
	};

	const handleSave = async () => {
		if (!config) return;
		setSaving(true);
		try {
			await invoke("update_config", { newConfig: config });
			toast.success("Settings saved successfully!");
		} catch (error) {
			console.error("Failed to update config:", error);
			toast.error(`Failed to save settings: ${error}`);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!config) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center p-4">
				<Header />
				<div className="mt-12 text-destructive">
					Failed to load configuration.
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col items-center p-4 pb-28">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				<Header />

				<Card className="border-none bg-card/50 backdrop-blur-md shadow-2xl">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-2xl">
							<Settings className="w-6 h-6 text-primary" />
							Settings
						</CardTitle>
						<CardDescription>
							Configure your music library and download engine.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<FolderPicker
							id="library-path"
							label="Music Library Path"
							value={config.library_path}
							onChange={(val) => setConfig({ ...config, library_path: val })}
						/>

						<div className="space-y-4 pt-4 border-t border-border/50">
							<h3 className="text-lg font-medium">Updates</h3>
							<div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4">
								<div className="space-y-0.5">
									<label
										htmlFor="auto-update"
										className="text-base font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Auto Update
									</label>
									<div className="text-sm text-muted-foreground">
										Automatically check for updates on startup
									</div>
								</div>
								<Switch
									id="auto-update"
									checked={config.auto_update}
									onCheckedChange={(checked) =>
										setConfig({ ...config, auto_update: checked })
									}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4">
								<div className="space-y-0.5">
									<div className="text-base font-medium">Check for Updates</div>
									<div className="text-sm text-muted-foreground">
										Manually check for new versions
									</div>
								</div>
								<Button variant="outline" onClick={handleCheckUpdate}>
									Check Now
								</Button>
							</div>
						</div>

						<div className="space-y-2 pt-4 border-t border-border/50">
							<label
								htmlFor="ytdlp-version"
								className="text-sm font-medium text-muted-foreground ml-1"
							>
								yt-dlp Version
							</label>
							<Input
								id="ytdlp-version"
								value={config.yt_dlp_version}
								onChange={(e) =>
									setConfig({ ...config, yt_dlp_version: e.target.value })
								}
								className="bg-background/50 border-border/50"
								placeholder="e.g. 2024.12.06"
							/>
						</div>

						<div className="pt-4">
							<Button className="w-full" onClick={handleSave} disabled={saving}>
								{saving ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Saving...
									</>
								) : (
									<>
										<Save className="mr-2 h-4 w-4" />
										Save Changes
									</>
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
