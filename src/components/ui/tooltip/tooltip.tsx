import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import { type ComponentProps, useId } from "react";

export const TooltipProvider = Primitive.Provider;
export function Tooltip({
	children,
	content,
}: {
	children: ComponentProps<typeof Primitive.Trigger>["render"];
	content: string;
}) {
	const descriptionId = useId();
	return (
		<Primitive.Root>
			<Primitive.Trigger render={children} aria-describedby={descriptionId} />
			<Primitive.Portal>
				<Primitive.Positioner sideOffset={8} className="z-80">
					<Primitive.Popup
						id={descriptionId}
						role="tooltip"
						className="rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background transition-[opacity,transform] duration-150 data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:opacity-0"
					>
						{content}
					</Primitive.Popup>
				</Primitive.Positioner>
			</Primitive.Portal>
		</Primitive.Root>
	);
}
