import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";

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

interface Config {
	library_path: string;
	yt_dlp_version: string;
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
			} finally {
				setLoading(false);
			}
		};
		fetchConfig();
	}, []);

	const handleSelectDir = async () => {
		if (!config) return;
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				defaultPath: config.library_path,
			});
			if (selected && typeof selected === "string") {
				setConfig({ ...config, library_path: selected });
			}
		} catch (error) {
			console.error("Failed to select directory:", error);
		}
	};

	const handleSave = async () => {
		if (!config) return;
		setSaving(true);
		try {
			await invoke("update_config", { newConfig: config });
		} catch (error) {
			console.error("Failed to update config:", error);
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
		<div className="min-h-screen bg-background flex flex-col items-center p-4">
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
						<div className="space-y-2">
							<label
								htmlFor="library-path"
								className="text-sm font-medium text-muted-foreground ml-1"
							>
								Music Library Path
							</label>
							<div className="flex gap-2">
								<Input
									id="library-path"
									value={config.library_path}
									readOnly
									className="bg-background/50 border-border/50"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={handleSelectDir}
									className="shrink-0 border-border/50"
								>
									<FolderOpen className="w-4 h-4" />
								</Button>
							</div>
						</div>

						<div className="space-y-2">
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
