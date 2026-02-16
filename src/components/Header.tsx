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
		<div className="flex flex-col items-center gap-6 mb-8 group">
			<Logo />
			<div className="text-center space-y-1">
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-muted-foreground text-sm tracking-wide">
					{subtitle}
				</p>
			</div>
		</div>
	);
}
