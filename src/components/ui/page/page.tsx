import { motion } from "framer-motion";
import { forwardRef } from "react";

import { fade } from "@/lib/motion";
import { cn } from "@/lib/utils";

const maxWidths = {
	sm: "max-w-2xl",
	md: "max-w-md",
	lg: "max-w-4xl",
} as const;

interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
	maxWidth?: keyof typeof maxWidths;
	mode?: "default" | "centered";
}

const Page = forwardRef<HTMLDivElement, PageProps>(
	(
		{ className, maxWidth = "sm", mode = "default", children, ...props },
		ref,
	) => (
		<motion.div variants={fade} initial="hidden" animate="visible">
			<div
				ref={ref}
				className={cn(
					"min-h-screen flex flex-col items-center p-4 pt-28 pb-28",
					mode === "centered" && "justify-center",
					className,
				)}
				{...props}
			>
				<div className={cn("w-full flex flex-col gap-8", maxWidths[maxWidth])}>
					{children}
				</div>
			</div>
		</motion.div>
	),
);
Page.displayName = "Page";

export { Page };
