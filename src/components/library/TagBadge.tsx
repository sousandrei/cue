import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { stringToColor } from "@/lib/utils";

interface TagBadgeProps {
	tag: string;
	onRemove?: (tag: string) => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
	const backgroundColor = stringToColor(tag);

	return (
		<Badge
			className="text-[10px] font-bold text-white border-none shadow-sm flex items-center gap-1.5 px-2.5 py-1 transition-all"
			style={{ backgroundColor }}
		>
			{tag}
			{onRemove && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(tag);
					}}
					className="hover:bg-white/20 rounded-full p-0.5 -mr-1 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
					aria-label={`Remove ${tag} tag`}
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</Badge>
	);
}
