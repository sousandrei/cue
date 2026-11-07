import { motion } from "framer-motion";

import { scaleIn } from "@/lib/motion";

export function Logo() {
	return (
		<motion.div
			variants={scaleIn}
			initial="hidden"
			animate="visible"
			className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
			whileHover={{ rotate: -6, scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="32"
				height="32"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="size-6"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</motion.div>
	);
}
