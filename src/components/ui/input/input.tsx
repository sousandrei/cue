import { Input as BaseInput } from "@base-ui/react/input";
import { forwardRef } from "react";

import { baseClassName } from "@/lib/utils";

const Input = forwardRef<
	HTMLInputElement,
	React.ComponentPropsWithoutRef<typeof BaseInput>
>(({ className, ...props }, ref) => {
	return (
		<BaseInput
			ref={ref}
			className={baseClassName(
				"h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive aria-invalid:outline-destructive",
				className,
			)}
			{...props}
		/>
	);
});
Input.displayName = "Input";

export { Input };
