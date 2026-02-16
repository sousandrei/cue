import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FolderPicker } from "@/components/FolderPicker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/hooks/useConfig";
import { ask, check } from "@/lib/tauri/api";
import { factoryReset, updateConfig } from "@/lib/tauri/commands";
import { performUpdate } from "@/lib/updater";

interface Config {
	library_path: string;
	yt_dlp_version: string;
	ffmpeg_version: string;
	bun_version: string;
	ejs_version: string;
	auto_update: boolean;
}

export const Route = createFileRoute("/config")({
	component: ConfigPage,
});

function ConfigPage() {
	const { config } = useConfig();
	const [saving, setSaving] = useState(false);

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
					onClick: () => performUpdate(update),
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

	const saveConfig = async (newConfig: Config) => {
		try {
			await updateConfig(newConfig);
		} catch (error) {
			console.error("Failed to update config:", error);
			toast.error(`Failed to save settings: ${error}`);
		}
	};

	const handleSave = async () => {
		if (!config) return;
		setSaving(true);
		try {
			await updateConfig(config);
			toast.success("Settings saved successfully!");
		} catch (error) {
			console.error("Failed to update config:", error);
			toast.error(`Failed to save settings: ${error}`);
		} finally {
			setSaving(false);
		}
	};

	const handleFactoryReset = async () => {
		const confirmed = await ask(
			"Are you sure you want to perform a factory reset? This will delete all downloaded binaries and your configuration. The app will restart.",
			{
				title: "Factory Reset",
				kind: "warning",
			},
		);

		if (!confirmed) {
			return;
		}

		try {
			toast.loading("Performing factory reset...", { id: "factory-reset" });
			await factoryReset();
		} catch (error) {
			console.error("Factory reset failed:", error);
			toast.error(`Factory reset failed: ${error}`, { id: "factory-reset" });
		}
	};

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
		<div className="min-h-screen bg-background flex flex-col items-center p-4 pt-28 pb-28">
			<div className="w-full max-w-2xl flex flex-col gap-8">
				<Header />

				<Card className="border-none bg-card/50 backdrop-blur-sm shadow-none">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
							<SlidersHorizontal className="w-6 h-6 text-primary" />
							Options
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<FolderPicker
							id="library-path"
							label="Music Library Path"
							value={config.library_path}
							onChange={(val) => saveConfig({ ...config, library_path: val })}
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
										saveConfig({ ...config, auto_update: checked })
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
									saveConfig({ ...config, yt_dlp_version: e.target.value })
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

						<div className="pt-8 border-t border-destructive/20 mt-4">
							<div className="flex flex-col gap-2">
								<h3 className="text-sm font-medium text-destructive">
									Danger Zone
								</h3>
								<p className="text-xs text-muted-foreground">
									Factory reset will delete all local configuration and
									utilities. The application will restart to initial setup.
								</p>
								<Button
									variant="destructive"
									className="w-full mt-2"
									onClick={handleFactoryReset}
								>
									Factory Reset
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
