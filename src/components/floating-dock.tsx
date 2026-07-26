import { Link, useLocation } from "@tanstack/react-router";
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

	return (
		<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
			<div className="flex items-center gap-4 px-6 py-3 rounded-full bg-glass-bg-strong backdrop-blur-[16px] border border-glass-border shadow-[0_8px_30px_-10px] shadow-black/50">
				{items.map((item) => {
					const isActive = location.pathname === item.href;

					return (
						<Link
							key={item.href}
							to={item.href}
							className={cn(
								"relative flex flex-col items-center gap-1 transition-colors duration-200 ease-in-out group",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon
								strokeWidth={1.25}
								className={cn(
									"w-6 h-6 transition-transform duration-200 ease-in-out group-hover:scale-110",
								)}
							/>
							<span className="sr-only">{item.title}</span>
							{isActive && (
								<div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary" />
							)}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
