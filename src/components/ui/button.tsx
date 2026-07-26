import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer gap-2 border",
	{
		variants: {
			variant: {
				default:
					"bg-primary border-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-[0_0_20px_-5px] shadow-primary/40",
				outline:
					"bg-glass-bg backdrop-blur-[16px] border-glass-border text-foreground hover:bg-glass-bg-strong",
				ghost:
					"bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.04] active:bg-white/[0.06]",
				destructive:
					"bg-accent-warm/15 backdrop-blur-[16px] border-accent-warm/30 text-accent-warm hover:bg-accent-warm/25 hover:border-accent-warm/40",
			},
			size: {
				default: "h-9 px-4",
				sm: "h-8 px-3 text-xs",
				icon: "h-9 w-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

interface ButtonProps
	extends React.ComponentPropsWithoutRef<typeof BaseButton>,
		VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, ...props }, ref) => {
		return (
			<BaseButton
				ref={ref}
				className={cn(buttonVariants({ variant, size }), className)}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
