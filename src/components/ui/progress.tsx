import { Progress as ProgressPrimitive } from "@base-ui/react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Progress = forwardRef<
	React.ComponentRef<typeof ProgressPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(
			"relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]",
			className,
		)}
		{...props}
	>
		<ProgressPrimitive.Track>
			<ProgressPrimitive.Indicator
				className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cool shadow-[0_0_10px_-2px] shadow-primary/40 transition-all duration-300 ease-out"
				style={{ width: `${props.value ?? 0}%` }}
			/>
		</ProgressPrimitive.Track>
	</ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
