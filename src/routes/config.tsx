import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { AboutDialog } from "@/components/about-dialog";
import { FolderPicker } from "@/components/folder-picker";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Page } from "@/components/ui/page";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
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
	const [checking, setChecking] = useState(false);
	const [resetOpen, setResetOpen] = useState(false);
	const [resetting, setResetting] = useState(false);

	const handleCheckUpdate = async () => {
		setChecking(true);
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
		} finally {
			setChecking(false);
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
		setResetting(true);
		try {
			toast.loading("Performing factory reset...", { id: "factory-reset" });
			await tauri.factoryReset();
			setResetOpen(false);
		} catch (error) {
			console.error("Factory reset failed:", error);
			toast.error(`Factory reset failed: ${error}`, { id: "factory-reset" });
		} finally {
			setResetting(false);
		}
	};

	if (!config) {
		return (
			<Page maxWidth="sm" scrollMode="contained">
				<Header />
				<div className="mt-12 text-destructive">
					Failed to load configuration.
				</div>
			</Page>
		);
	}

	return (
		<Page maxWidth="sm" scrollMode="contained">
			<Header
				title="Options"
				subtitle="Make Cue feel at home in your workflow."
				action={<AboutDialog />}
			/>

			<Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
				<CardHeader className="shrink-0 px-6 pt-6">
					<CardTitle className="flex items-center gap-2">
						<SlidersHorizontal className="w-5 h-5 text-primary" />
						Preferences
					</CardTitle>
				</CardHeader>
				<CardContent
					className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 pb-6 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-ring"
					role="region"
					aria-label="Preferences settings"
					tabIndex={0}
				>
					<FolderPicker
						id="library-path"
						label="Music Library Path"
						value={config.library_path}
						onChange={(val) => saveConfig({ ...config, library_path: val })}
					/>

					<div className="space-y-4 pt-4 border-t border-border">
						<h3 className="text-sm font-semibold text-foreground">Updates</h3>
						<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
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

						<div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 last:border-b-0">
							<div className="space-y-0.5">
								<div className="text-sm font-medium">Check for Updates</div>
								<div className="text-sm text-muted-foreground">
									Manually check for new versions
								</div>
							</div>
							<Button
								variant="outline"
								onClick={handleCheckUpdate}
								loading={checking}
							>
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
							<h3 className="text-sm font-semibold text-destructive">
								Danger Zone
							</h3>
							<p className="text-xs text-muted-foreground">
								Factory reset will delete all local configuration and utilities.
								The application will restart to initial setup.
							</p>
							<Button
								variant="destructive"
								className="w-full mt-2"
								onClick={() => setResetOpen(true)}
							>
								Factory Reset
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
			<ConfirmationDialog
				open={resetOpen}
				onOpenChange={setResetOpen}
				title="Reset Cue?"
				description="This deletes all downloaded utilities and your configuration. The application will restart."
				confirmLabel="Factory Reset"
				onConfirm={handleFactoryReset}
				busy={resetting}
			/>
		</Page>
	);
}
