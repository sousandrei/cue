import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Preserve Base UI's state-aware className API when adding library styles. */
export function baseClassName<State>(
	base: string,
	custom?: string | ((state: State) => string | undefined),
) {
	return (state: State) =>
		cn(base, typeof custom === "function" ? custom(state) : custom);
}
