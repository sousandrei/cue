import { Popover as Primitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { baseClassName } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverClose = Primitive.Close;

interface PopoverContentProps extends ComponentProps<typeof Primitive.Popup> {
	align?: ComponentProps<typeof Primitive.Positioner>["align"];
}

export function PopoverContent({
	align = "start",
	className,
	...props
}: PopoverContentProps) {
	return (
		<Primitive.Portal>
			<Primitive.Positioner
				align={align}
				sideOffset={8}
				collisionPadding={16}
				className="z-70"
			>
				<Primitive.Popup
					className={baseClassName(
						"w-72 max-w-[calc(100vw-2rem)] max-h-[var(--available-height)] origin-[var(--transform-origin)] overflow-y-auto rounded-xl bg-surface-raised p-4 text-foreground shadow-[0_12px_40px_-8px_#000a] outline-none transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:scale-95 data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
						className,
					)}
					{...props}
				/>
			</Primitive.Positioner>
		</Primitive.Portal>
	);
}

export function PopoverTitle({
	className,
	...props
}: ComponentProps<typeof Primitive.Title>) {
	return (
		<Primitive.Title
			className={baseClassName("text-sm font-semibold", className)}
			{...props}
		/>
	);
}

export function PopoverDescription({
	className,
	...props
}: ComponentProps<typeof Primitive.Description>) {
	return (
		<Primitive.Description
			className={baseClassName(
				"text-xs leading-relaxed text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}
