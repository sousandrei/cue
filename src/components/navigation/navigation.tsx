import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	ArrowDownToLine,
	Disc3,
	type LucideIcon,
	SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface DockItem {
	title: string;
	icon: LucideIcon;
	href: string;
}

const items: DockItem[] = [
	{ title: "Intake", icon: ArrowDownToLine, href: "/" },
	{ title: "Collection", icon: Disc3, href: "/library" },
	{ title: "Options", icon: SlidersHorizontal, href: "/config" },
];

export function FloatingDock() {
	const location = useLocation();
	if (location.pathname === "/setup") return null;

	return (
		<nav
			aria-label="Primary navigation"
			className="fixed bottom-5 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2"
		>
			<div className="flex items-center gap-1 rounded-2xl bg-surface-raised/95 p-1.5 shadow-[0_8px_32px_-8px_#0009] backdrop-blur-xl">
				{items.map((item) => {
					const isActive = location.pathname === item.href;

					return (
						<Link
							key={item.href}
							to={item.href}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"group relative isolate flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 sm:px-5",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon
								aria-hidden="true"
								strokeWidth={1.75}
								className={cn(
									"size-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5",
								)}
							/>
							<span>{item.title}</span>
							{isActive && (
								<motion.span
									layoutId="cue-navigation"
									className="absolute inset-0 -z-10 rounded-xl bg-primary-subtle"
									transition={{ type: "spring", stiffness: 420, damping: 32 }}
								/>
							)}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
