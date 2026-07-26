import { Input as BaseInput } from "@base-ui/react/input";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<
	HTMLInputElement,
	React.ComponentPropsWithoutRef<typeof BaseInput>
>(({ className, ...props }, ref) => {
	return (
		<BaseInput
			ref={ref}
			className={cn(
				"h-9 w-full bg-transparent border-b border-glass-border px-1 py-2 text-sm text-foreground transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 disabled:opacity-40",
				className,
			)}
			{...props}
		/>
	);
});
Input.displayName = "Input";

export { Input };
