import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { Updater } from "@/components/Updater";
import { FloatingDock } from "@/components/floating-dock";
import { getConfig } from "@/lib/tauri-commands";

const RootLayout = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		const checkConfig = async () => {
			try {
				const config = await getConfig();
				if (!config && location.pathname !== "/setup") {
					navigate({ to: "/setup" });
				}
			} catch (error) {
				console.error("Failed to check config:", error);
			} finally {
				setChecked(true);
			}
		};
		checkConfig();
	}, [navigate, location.pathname]);

	if (!checked) return null;

	return (
		<div className="min-h-screen w-full relative overflow-x-hidden bg-background text-foreground">
			<Updater />
			<Toaster position="top-right" richColors closeButton />
			<main className="relative w-full min-h-screen">
				<AnimatePresence initial={false}>
					<motion.div
						key={location.pathname}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{
							duration: 0.3,
							ease: "linear"
						}}
						className="w-full h-full absolute inset-0"
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
