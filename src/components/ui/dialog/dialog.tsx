import { Dialog as Primitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { baseClassName, cn } from "@/lib/utils";
import { Button } from "../button";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({
	className,
	children,
	...props
}: ComponentProps<typeof Primitive.Popup>) {
	return (
		<Primitive.Portal>
			<Primitive.Backdrop className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0" />
			<Primitive.Popup
				className={baseClassName(
					"fixed top-1/2 left-1/2 z-70 grid max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl bg-surface-raised p-6 text-foreground shadow-[0_24px_80px_-16px_#0009] outline-none transition-[opacity,scale,filter] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:scale-95 data-starting-style:opacity-0 data-starting-style:blur-sm data-ending-style:scale-95 data-ending-style:opacity-0",
					className,
				)}
				{...props}
			>
				{children}
				<Primitive.Close
					render={
						<Button variant="ghost" size="icon" aria-label="Close dialog" />
					}
					className="absolute right-3 top-3"
				>
					<X aria-hidden="true" />
				</Primitive.Close>
			</Primitive.Popup>
		</Primitive.Portal>
	);
}
export function DialogTitle({
	className,
	...props
}: ComponentProps<typeof Primitive.Title>) {
	return (
		<Primitive.Title
			className={baseClassName(
				"pr-8 text-xl font-semibold tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}
export function DialogDescription({
	className,
	...props
}: ComponentProps<typeof Primitive.Description>) {
	return (
		<Primitive.Description
			className={baseClassName(
				"text-sm leading-relaxed text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-wrap justify-end gap-2 pt-2", className)}
			{...props}
		/>
	);
}
