import { motion } from "framer-motion";
import { forwardRef } from "react";

import { fade } from "@/lib/motion";
import { cn } from "@/lib/utils";

const maxWidths = {
	sm: "max-w-2xl",
	md: "max-w-md",
	lg: "max-w-6xl",
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
					"min-h-screen flex min-w-0 flex-col items-center px-5 pt-10 pb-28 sm:px-8 sm:pt-14",
					mode === "centered" && "justify-center",
					className,
				)}
				{...props}
			>
				<div
					className={cn(
						"flex w-full min-w-0 flex-col gap-7",
						maxWidths[maxWidth],
					)}
				>
					{children}
				</div>
			</div>
		</motion.div>
	),
);
Page.displayName = "Page";

export { Page };
