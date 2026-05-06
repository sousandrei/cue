import { toast } from "sonner";
import type { TauriService, Update } from "@/lib/tauri/core/types";

export async function performUpdate(update: Update, tauri?: TauriService) {
	const toastId = "update-download";

	try {
		await update.downloadAndInstall((event: any) => {
			switch (event.event) {
				case "Started":
					toast.loading("Downloading update...", { id: toastId });
					break;
				case "Progress":
					break;
				case "Finished":
					toast.loading("Installing update...", { id: toastId });
					break;
			}
		});

		toast.success("Update installed!", {
			id: toastId,
			description: "Restart the application to apply the changes.",
			action: {
				label: "Restart Now",
				onClick: () => tauri?.relaunch(),
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
