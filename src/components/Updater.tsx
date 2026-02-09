import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";
import { getConfig } from "@/lib/tauri-commands";

export function Updater() {
	useEffect(() => {
		const checkUpdate = async () => {
			try {
				const config = await getConfig();
				if (!config?.auto_update) return;

				const update = await check();
				if (update) {
					toast.info(`Update Available: ${update.version}`, {
						description: `A new version of Cue is available.\n${update.body}`,
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
											case "Progress":
												// You could update progress here if you want
												break;
											case "Finished":
												toast.dismiss("update-download");
												toast.success("Update downloaded. Restarting...");
												break;
										}
									});

									await import("@tauri-apps/plugin-process").then(
										({ relaunch }) => relaunch(),
									);
								} catch (e) {
									toast.error("Failed to update", { description: String(e) });
								}
							},
						},
						duration: Infinity, // Keep it open
					});
				}
			} catch (e) {
				console.error("Failed to check for updates:", e);
			}
		};

		checkUpdate();
	}, []);

	return null;
}
