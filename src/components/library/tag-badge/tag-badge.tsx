import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TagBadgeProps {
	tag: string;
	onRemove?: (tag: string) => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
	return (
		<Badge
			variant="outline"
			className="max-w-full gap-1.5 border-transparent bg-surface-raised px-2 py-1 text-xs font-medium text-foreground"
		>
			<span className="truncate">{tag}</span>
			{onRemove && (
				<Button
					variant="ghost"
					size="icon"
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(tag);
					}}
					className="-mr-1 size-5 rounded-full hover:bg-muted"
					aria-label={`Remove ${tag} tag`}
				>
					<X className="h-3 w-3" />
				</Button>
			)}
		</Badge>
	);
}
