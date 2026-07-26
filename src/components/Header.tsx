import { Logo } from "@/components/Logo";

interface HeaderProps {
	title?: string;
	subtitle?: string;
}

export function Header({
	title = "Cue",
	subtitle = "Paste a link to start downloading",
}: HeaderProps) {
	return (
		<div className="flex flex-col items-center gap-6 group">
			<Logo />
			<div className="text-center space-y-1">
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground">{subtitle}</p>
			</div>
		</div>
	);
}
