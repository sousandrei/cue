import { AlertCircle, CheckCircle2, Music } from "lucide-react";

import type { DownloadJob } from "@/hooks/useDownload";

interface StatusIconProps {
	status: DownloadJob["status"];
	size?: "sm" | "md";
	className?: string;
}

export function StatusIcon({
	status,
	size = "md",
	className = "",
}: StatusIconProps) {
	const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
	const containerPadding = size === "sm" ? "p-1" : "p-2";

	const getStatusStyles = () => {
		switch (status) {
			case "completed":
				return "bg-green-500/20 text-green-500";
			case "error":
				return "bg-destructive/20 text-destructive";
			default:
				return "bg-primary/10 text-primary";
		}
	};

	const Icon = () => {
		switch (status) {
			case "completed":
				return <CheckCircle2 className={iconSize} />;
			case "error":
				return <AlertCircle className={iconSize} />;
			default:
				return <Music className={iconSize} />;
		}
	};

	return (
		<div
			className={`${containerPadding} rounded-full shrink-0 ${getStatusStyles()} ${className}`}
		>
			<Icon />
		</div>
	);
}
