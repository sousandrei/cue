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
			className={`flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-glass-border rounded-2xl bg-glass-bg backdrop-blur-[16px] ${className}`}
		>
			<div className="relative mb-4">
				<div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse" />
				<Icon className="w-12 h-12 text-primary relative z-10" />
			</div>
			<h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
			{description && (
				<p className="text-sm text-muted-foreground max-w-xs">{description}</p>
			)}
		</motion.div>
	);
}
