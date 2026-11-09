import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface HeaderProps {
	title?: string;
	subtitle?: string;
	action?: ReactNode;
	actionClassName?: string;
}

export function Header({
	title = "Cue",
	subtitle = "Paste a link to start downloading",
	action,
	actionClassName,
}: HeaderProps) {
	return (
		<header className="flex min-w-0 shrink-0 flex-wrap items-center gap-4">
			<Logo />
			<div className="min-w-0 flex-1 space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground">{subtitle}</p>
			</div>
			{action && (
				<div className={cn("ml-auto shrink-0", actionClassName)}>{action}</div>
			)}
		</header>
	);
}
