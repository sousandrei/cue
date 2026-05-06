import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function stringToColor(str: string) {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		// djb2 algorithm for better distribution
		hash = (hash << 5) + hash + str.charCodeAt(i);
	}

	// Multiply by a large prime to spread the hues more widely
	const h = Math.abs(hash * 137) % 360;

	// Lower saturation (50%) and lightness (35%) for a professional look
	// that guarantees good contrast with white text.
	return `hsl(${h}, 50%, 35%)`;
}
