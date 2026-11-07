import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FloatingDock } from "@/components/navigation";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Updater } from "@/components/updater";
import { TauriProvider, useTauri } from "@/lib/tauri/TauriProvider";

const RootLayoutContent = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const tauri = useTauri();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		const checkAppStatus = async () => {
			try {
				const [config, isHealthy] = await Promise.all([
					tauri.getConfig(),
					tauri.checkHealth(),
				]);

				const isSetupPage = location.pathname === "/setup";

				if ((!config || !isHealthy) && !isSetupPage) {
					navigate({ to: "/setup" });
				}
			} catch (error) {
				console.error("Failed to check app status:", error);
			} finally {
				setChecked(true);
			}
		};
		checkAppStatus();
	}, [navigate, location.pathname, tauri]);

	if (!checked) return null;

	return (
		<div className="min-h-screen w-full relative overflow-x-hidden text-foreground">
			<Updater />
			<main className="relative w-full min-h-screen">
				<Outlet />
			</main>
			<FloatingDock />
		</div>
	);
};

const RootLayout = () => (
	<TauriProvider>
		<ToastProvider>
			<TooltipProvider>
				<RootLayoutContent />
			</TooltipProvider>
		</ToastProvider>
	</TauriProvider>
);

export const Route = createRootRoute({ component: RootLayout });
