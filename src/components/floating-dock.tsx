import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, type LucideIcon, Settings, Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
	title: string;
	icon: LucideIcon;
	href: string;
}

const items: DockItem[] = [
	{ title: "Home", icon: Home, href: "/" },
	{ title: "Library", icon: Table, href: "/library" },
	{ title: "Playlists", icon: Table, href: "/playlists" },
	{ title: "Config", icon: Settings, href: "/config" },
];

export function FloatingDock() {
	const location = useLocation();

	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
			<motion.div
				layout
				className="flex items-center gap-2 p-2 rounded-2xl bg-background/80 backdrop-blur-md border shadow-lg ring-1 ring-white/10"
			>
				{items.map((item) => {
					const isActive = location.pathname === item.href;

					return (
						<Link
							key={item.href}
							to={item.href}
							className={cn(
								"relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
								isActive
									? "text-primary-foreground"
									: "text-muted-foreground hover:bg-muted hover:text-foreground",
							)}
						>
							{isActive && (
								<motion.div
									layoutId="dock-active"
									className="absolute inset-0 bg-primary rounded-xl"
									transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
								/>
							)}
							<div className="relative z-10 w-full h-full flex items-center justify-center group">
								<item.icon className="w-6 h-6" />

								{/* Tooltip */}
								<span className="absolute -top-10 scale-0 transition-all rounded bg-primary px-2 py-1 text-xs text-primary-foreground group-hover:scale-100">
									{item.title}
								</span>
							</div>
						</Link>
					);
				})}
			</motion.div>
		</div>
	);
}
