import { Switch as SwitchPrimitive } from "@base-ui/react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Switch = forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		className={cn(
			"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-glass-border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-primary/30 data-[state=checked]:border-primary/50 data-[state=unchecked]:bg-glass-bg",
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={cn(
				"pointer-events-none block h-3.5 w-3.5 rounded-full bg-muted-foreground/50 shadow-sm ring-0 transition-all duration-200 data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary data-[state=unchecked]:translate-x-[3px]",
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
