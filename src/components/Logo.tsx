import { motion } from "framer-motion";

export function Logo() {
	return (
		<motion.div
			initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
			animate={{ scale: 1, opacity: 1, rotate: 0 }}
			transition={{
				duration: 0.5,
				type: "spring",
				stiffness: 200,
				damping: 15,
			}}
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
