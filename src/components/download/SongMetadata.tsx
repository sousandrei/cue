import type { MetadataPayload } from "@/lib/tauri/commands";

interface SongMetadataProps {
	metadata: MetadataPayload;
	size?: "sm" | "md";
	className?: string;
}

export function SongMetadata({
	metadata,
	size = "md",
	className = "",
}: SongMetadataProps) {
	if (size === "sm") {
		return (
			<div className={`flex-1 min-w-0 ${className}`}>
				<p className="text-xs font-bold truncate leading-snug">
					{metadata.title}
				</p>
				<p className="text-[10px] text-muted-foreground truncate leading-snug mt-0.5">
					<span className="font-medium">{metadata.artist}</span>
					{metadata.album && (
						<>
							<span className="mx-1 opacity-40">•</span>
							<span>{metadata.album}</span>
						</>
					)}
				</p>
			</div>
		);
	}

	return (
		<div className={`flex-1 min-w-0 ${className}`}>
			<h3 className="font-bold truncate text-sm leading-snug">
				{metadata.title}
			</h3>
			<p className="text-[10px] text-muted-foreground truncate leading-snug mt-0.5 opacity-80">
				<span className="font-medium">{metadata.artist}</span>
				{metadata.album && (
					<>
						<span className="mx-1 opacity-40">•</span>
						<span>{metadata.album}</span>
					</>
				)}
			</p>
		</div>
	);
}
