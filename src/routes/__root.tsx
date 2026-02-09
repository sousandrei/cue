import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { FloatingDock } from "@/components/floating-dock";
import { Updater } from "@/components/Updater";
import { checkHealth, getConfig } from "@/lib/tauri-commands";

const RootLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		const checkAppStatus = async () => {
			try {
				const [config, isHealthy] = await Promise.all([
					getConfig(),
					checkHealth(),
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
	}, [navigate, location.pathname]);

	if (!checked) return null;

	return (
		<div className="min-h-screen w-full relative overflow-x-hidden bg-background text-foreground">
			<Updater />
			<Toaster position="top-right" richColors closeButton />
			<main className="relative grid grid-cols-1 w-full min-h-screen">
				<AnimatePresence initial={false}>
					<motion.div
						key={location.pathname}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{
							duration: 0.3,
							ease: "linear",
						}}
						className="row-start-1 col-start-1 w-full min-h-screen"
					>
						<Outlet />
					</motion.div>
				</AnimatePresence>
			</main>
			<FloatingDock />
		</div>
	);
};

export const Route = createRootRoute({ component: RootLayout });
