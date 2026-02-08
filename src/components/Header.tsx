interface HeaderProps {
	title?: string;
	subtitle?: string;
}

export function Header({
	title = "Synqed",
	subtitle = "Paste a link to start downloading",
}: HeaderProps) {
	return (
		<div className="text-center space-y-2 mb-4">
			<h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60 py-1">
				{title}
			</h1>
			<p className="text-muted-foreground text-lg">{subtitle}</p>
		</div>
	);
}
