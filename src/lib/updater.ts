import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

/**
 * Performs the update process: downloading, installing, and relaunching.
 * Handles progress and error toasts.
 */
export async function performUpdate(update: Update) {
	const toastId = "update-download";

	try {
		await update.downloadAndInstall((event) => {
			switch (event.event) {
				case "Started":
					toast.loading("Downloading update...", { id: toastId });
					break;
				case "Progress":
					// Progress is handled by Tauri
					break;
				case "Finished":
					// Download is finished, installation is about to begin
					toast.loading("Installing update...", { id: toastId });
					break;
			}
		});

		toast.success("Update installed!", {
			id: toastId,
			description: "Restart the application to apply the changes.",
			action: {
				label: "Restart Now",
				onClick: () => relaunch(),
			},
			duration: Infinity,
		});
	} catch (error) {
		console.error("Update failed:", error);
		toast.error("Failed to update", {
			id: toastId,
			description: String(error),
		});
	}
}
