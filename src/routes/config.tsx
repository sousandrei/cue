import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { FolderPicker } from "@/components/FolderPicker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { useConfig } from "@/hooks/useConfig";
import type { Config } from "@/lib/tauri/core/types";
import { useTauri } from "@/lib/tauri/TauriProvider";
import { performUpdate } from "@/lib/updater";

export const Route = createFileRoute("/config")({
	component: ConfigPage,
});

function ConfigPage() {
	const tauri = useTauri();
	const { config } = useConfig();
	const [saving, setSaving] = useState(false);

	const handleCheckUpdate = async () => {
		try {
			toast.loading("Checking for updates...", { id: "manual-check" });
			const update = await tauri.checkUpdate();
			toast.dismiss("manual-check");

			if (!update) {
				toast.info("You are up to date!");
				return;
			}

			toast.info(`Update Available: ${update.version}`, {
				description: `A new version is available.\n${update.body}`,
				action: {
					label: "Update Now",
					onClick: () => performUpdate(update, tauri),
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
			await tauri.updateConfig(newConfig);
		} catch (error) {
			console.error("Failed to update config:", error);
			toast.error(`Failed to save settings: ${error}`);
		}
	};

	const handleSave = async () => {
		if (!config) return;
		setSaving(true);
		try {
			await tauri.updateConfig(config);
			toast.success("Settings saved successfully!");
		} catch (error) {
			console.error("Failed to update config:", error);
			toast.error(`Failed to save settings: ${error}`);
		} finally {
			setSaving(false);
		}
	};

	const handleFactoryReset = async () => {
		const confirmed = await tauri.ask(
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
			await tauri.factoryReset();
		} catch (error) {
			console.error("Factory reset failed:", error);
			toast.error(`Factory reset failed: ${error}`, { id: "factory-reset" });
		}
	};

	if (!config) {
		return (
			<Page maxWidth="sm">
				<Header />
				<div className="mt-12 text-destructive">
					Failed to load configuration.
				</div>
			</Page>
		);
	}

	return (
		<Page maxWidth="sm">
			<Header />

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<SlidersHorizontal className="w-5 h-5 text-primary" />
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

					<div className="space-y-4 pt-4 border-t border-glass-border">
						<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
							Updates
						</h3>
						<div className="flex items-center justify-between rounded-lg border border-glass-border bg-glass-bg backdrop-blur-[16px] p-4">
							<div className="space-y-0.5">
								<label
									htmlFor="auto-update"
									className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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

						<div className="flex items-center justify-between rounded-lg border border-glass-border bg-glass-bg backdrop-blur-[16px] p-4">
							<div className="space-y-0.5">
								<div className="text-sm font-medium">Check for Updates</div>
								<div className="text-sm text-muted-foreground">
									Manually check for new versions
								</div>
							</div>
							<Button variant="outline" onClick={handleCheckUpdate}>
								Check Now
							</Button>
						</div>
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
							<h3 className="text-sm font-semibold uppercase tracking-wider text-destructive">
								Danger Zone
							</h3>
							<p className="text-xs text-muted-foreground">
								Factory reset will delete all local configuration and utilities.
								The application will restart to initial setup.
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
		</Page>
	);
}
