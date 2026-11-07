import { Field as Primitive } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { baseClassName } from "@/lib/utils";

export function Field({
	className,
	...props
}: ComponentProps<typeof Primitive.Root>) {
	return (
		<Primitive.Root
			className={baseClassName("grid gap-2", className)}
			{...props}
		/>
	);
}
export function FieldLabel({
	className,
	...props
}: ComponentProps<typeof Primitive.Label>) {
	return (
		<Primitive.Label
			className={baseClassName(
				"text-sm font-medium text-foreground",
				className,
			)}
			{...props}
		/>
	);
}
export function FieldDescription({
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
export function FieldError({
	className,
	...props
}: ComponentProps<typeof Primitive.Error>) {
	return (
		<Primitive.Error
			className={baseClassName("text-xs text-destructive", className)}
			{...props}
		/>
	);
}
