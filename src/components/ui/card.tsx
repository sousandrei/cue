import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-xl p-6", {
	variants: {
		variant: {
			default: "border border-glass-border bg-glass-bg backdrop-blur-[16px]",
			flat: "border border-glass-border bg-transparent",
			active:
				"border border-primary/30 bg-primary/10 backdrop-blur-[16px] shadow-[0_0_30px_-10px] shadow-primary/30",
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

const CardTitle = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"font-semibold text-xl tracking-tight text-foreground",
			className,
		)}
		{...props}
	/>
));
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
