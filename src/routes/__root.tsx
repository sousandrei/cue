import {
	createRootRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
		<div className="min-h-screen w-full relative">
			<Outlet />
			<FloatingDock />
		</div>
	);
};

export const Route = createRootRoute({ component: RootLayout });
