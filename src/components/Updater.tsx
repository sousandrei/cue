import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";
import { getConfig } from "@/lib/tauri-commands";
import { performUpdate } from "@/lib/updater";

export function Updater() {
	useEffect(() => {
		const checkUpdate = async () => {
			try {
				const config = await getConfig();
				if (!config?.auto_update) return;

				const update = await check();
				if (!update) return;

				toast.info(`Update Available: ${update.version}`, {
					description: `A new version of Cue is available.\n${update.body}`,
					action: {
						label: "Update Now",
						onClick: () => performUpdate(update),
					},
					duration: Infinity,
				});
			} catch (e) {
				console.error("Failed to check for updates:", e);
			}
		};

		checkUpdate();
	}, []);

	return null;
}
