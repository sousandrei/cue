export function Header() {
	return (
		<div className="text-center space-y-2">
			<h1 className="text-4xl font-bold tracking-tighter sm:text-5xl bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
				Synqed
			</h1>
			<p className="text-muted-foreground text-lg">
				Paste a link to start downloading
			</p>
		</div>
	);
}
