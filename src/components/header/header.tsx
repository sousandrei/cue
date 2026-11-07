import { Logo } from "@/components/logo";

interface HeaderProps {
	title?: string;
	subtitle?: string;
}

export function Header({
	title = "Cue",
	subtitle = "Paste a link to start downloading",
}: HeaderProps) {
	return (
		<header className="flex min-w-0 items-center gap-4">
			<Logo />
			<div className="min-w-0 space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground">{subtitle}</p>
			</div>
		</header>
	);
}
