import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { forwardRef } from "react";

import { baseClassName } from "@/lib/utils";

const Progress = forwardRef<
	React.ComponentRef<typeof ProgressPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={baseClassName(
			"relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
			className,
		)}
		{...props}
	>
		<ProgressPrimitive.Track className="h-full w-full overflow-hidden rounded-full">
			<ProgressPrimitive.Indicator className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] data-indeterminate:w-1/3 data-indeterminate:animate-[cue-indeterminate_1.2s_ease-in-out_infinite]" />
		</ProgressPrimitive.Track>
	</ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
