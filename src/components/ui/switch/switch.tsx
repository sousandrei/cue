import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { forwardRef } from "react";

import { baseClassName } from "@/lib/utils";

const Switch = forwardRef<
	React.ComponentRef<typeof SwitchPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitive.Root
		ref={ref}
		className={baseClassName(
			"peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-45 data-disabled:cursor-not-allowed data-disabled:opacity-45 data-checked:border-primary data-checked:bg-primary",
			className,
		)}
		{...props}
	>
		<SwitchPrimitive.Thumb
			className={baseClassName(
				"pointer-events-none block size-4 translate-x-[3px] rounded-full bg-muted-foreground transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-checked:translate-x-[23px] data-checked:bg-primary-foreground",
			)}
		/>
	</SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
