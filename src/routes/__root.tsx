import { createRootRoute, Outlet } from "@tanstack/react-router";

// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { FloatingDock } from "@/components/floating-dock";

const RootLayout = () => (
	<div className="min-h-screen w-full relative">
		<Outlet />
		<FloatingDock />
	</div>
);

export const Route = createRootRoute({ component: RootLayout });
