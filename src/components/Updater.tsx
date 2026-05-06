import { useEffect } from "react";
import { toast } from "sonner";

import { useTauri } from "@/lib/tauri/TauriProvider";
import { performUpdate } from "@/lib/updater";

export function Updater() {
	const tauri = useTauri();

	useEffect(() => {
		const checkUpdate = async () => {
			try {
				const config = await tauri.getConfig();
				if (!config?.auto_update) return;

				const update = await tauri.checkUpdate();
				if (!update) return;

				toast.info(`Update Available: ${update.version}`, {
					description: `A new version of Cue is available.\n${update.body}`,
					action: {
						label: "Update Now",
						onClick: () => performUpdate(update, tauri),
					},
					duration: Infinity,
				});
			} catch (e) {
				console.error("Failed to check for updates:", e);
			}
		};

		checkUpdate();
	}, [tauri]);

	return null;
}
