import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-xl p-6", {
	variants: {
		variant: {
			default: "border border-border bg-card text-card-foreground",
			flat: "border border-border bg-transparent",
			active: "border border-primary/35 bg-primary-subtle",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

interface CardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
	({ className, variant, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(cardVariants({ variant }), className)}
			{...props}
		/>
	),
);
Card.displayName = "Card";

const CardHeader = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex flex-col gap-1.5 pb-2", className)}
		{...props}
	/>
));
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
	as?: "h1" | "h2" | "h3";
}
const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
	({ as: Heading = "h2", className, ...props }, ref) => (
		<Heading
			ref={ref}
			className={cn(
				"font-semibold text-xl tracking-tight text-foreground",
				className,
			)}
			{...props}
		/>
	),
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn("pt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("flex items-center pt-4", className)}
		{...props}
	/>
));
CardFooter.displayName = "CardFooter";

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	cardVariants,
};
