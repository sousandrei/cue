import { Progress as ProgressPrimitive } from "@base-ui/react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
	className,
	value,
	...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
	return (
		<ProgressPrimitive.Root
			className={cn(
				"bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
				className,
			)}
			value={value}
			{...props}
		>
			<ProgressPrimitive.Track className="h-full w-full">
				<ProgressPrimitive.Indicator
					className="bg-primary h-full transition-all"
					style={{ width: `${value || 0}%` }}
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
