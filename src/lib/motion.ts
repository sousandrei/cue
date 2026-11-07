import type { Variants } from "framer-motion";

export const fade: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export const slideUp: Variants = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { type: "spring", stiffness: 300, damping: 25 },
	},
};

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { type: "spring", stiffness: 400, damping: 25 },
	},
};

export const queueItem: Variants = {
	hidden: { opacity: 0, y: 8, filter: "blur(2px)" },
	visible: (index: number) => ({
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: {
			type: "spring",
			stiffness: 360,
			damping: 30,
			delay: Math.min(index, 8) * 0.055,
		},
	}),
};
