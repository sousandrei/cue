import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { slideUp } from "@/lib/motion";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	className?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	className = "",
}: EmptyStateProps) {
	return (
		<motion.div
			variants={slideUp}
			initial="hidden"
			animate="visible"
			className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center ${className}`}
		>
			<div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-subtle">
				<Icon className="size-6 text-primary" aria-hidden="true" />
			</div>
			<h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
			{description && (
				<p className="text-sm text-muted-foreground max-w-xs">{description}</p>
			)}
		</motion.div>
	);
}
