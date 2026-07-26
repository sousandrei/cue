import { motion } from "framer-motion";

import { scaleIn } from "@/lib/motion";

export function Logo() {
	return (
		<motion.div
			variants={scaleIn}
			initial="hidden"
			animate="visible"
			className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground"
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
				className="w-8 h-8 mt-1"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</motion.div>
	);
}
