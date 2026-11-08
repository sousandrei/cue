import { ArrowUpRight, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useTauri } from "@/lib/tauri/TauriProvider";
import { version } from "../../../package.json";

const repository = "https://github.com/sousandrei/cue";

export function AboutDialog() {
	const tauri = useTauri();
	const [linkError, setLinkError] = useState<string | null>(null);

	function link(label: string, href: string) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-1 rounded-sm text-primary underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
				onClick={(event) => {
					event.preventDefault();
					setLinkError(null);
					void tauri.openUrl(href).catch(() => {
						setLinkError(`Could not open your browser. Visit ${href}`);
					});
				}}
			>
				{label}
				<ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
			</a>
		);
	}

	return (
		<Dialog>
			<DialogTrigger render={<Button variant="ghost" size="sm" />}>
				<Info aria-hidden="true" />
				About &amp; licenses
			</DialogTrigger>
			<DialogContent className="max-w-lg gap-6">
				<div className="space-y-2">
					<DialogTitle>About Cue</DialogTitle>
					<DialogDescription>Version {version}</DialogDescription>
				</div>
				<div className="space-y-5 text-sm leading-relaxed">
					<p>{link("View repository", repository)}</p>
					<section className="space-y-2" aria-labelledby="cue-license-title">
						<h3 id="cue-license-title" className="font-semibold">
							Cue application
						</h3>
						<p className="text-muted-foreground">
							Copyright © 2026 Andrei Sousa. Cue is licensed under{" "}
							{link("GNU GPL v3", "https://www.gnu.org/licenses/gpl-3.0.html")}{" "}
							(GPL-3.0-only). You may redistribute and modify it under that
							license. It comes without any warranty.
						</p>
					</section>
					<section
						className="space-y-2"
						aria-labelledby="rekordbox-license-title"
					>
						<h3 id="rekordbox-license-title" className="font-semibold">
							Rekordbox integration
						</h3>
						<p className="text-muted-foreground">
							Rekordbox support on Windows and macOS uses{" "}
							{link("rbox", "https://github.com/dylanljones/rbox")}, also
							licensed under GPL-3.0-only. Third-party components keep their own
							licenses and copyright notices.
						</p>
					</section>
					<section
						className="space-y-2 border-t border-border pt-5"
						aria-labelledby="source-title"
					>
						<h3 id="source-title" className="font-semibold">
							Source code for your release
						</h3>
						<p className="text-muted-foreground">
							Open the release matching your installed version and select Source
							code (zip). The release notes link to the build instructions and
							the sources for its dependencies.
						</p>
						<p>
							{link("Releases & source downloads", `${repository}/releases`)}
						</p>
					</section>
					{linkError && (
						<p role="alert" className="break-words text-destructive">
							{linkError}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
