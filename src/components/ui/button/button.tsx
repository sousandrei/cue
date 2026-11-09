import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { baseClassName } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-45 data-disabled:cursor-not-allowed data-disabled:opacity-45 select-none cursor-pointer gap-2 border active:enabled:translate-y-px [&_svg]:size-4",
	{
		variants: {
			variant: {
				default:
					"bg-primary-strong border-transparent text-primary-strong-foreground hover:bg-primary-hover active:bg-primary-active",
				outline:
					"bg-surface-raised border-border text-foreground hover:bg-muted hover:border-muted-foreground/50",
				ghost:
					"bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-raised",
				destructive:
					"bg-destructive/5 border-destructive/25 text-destructive hover:bg-destructive/10 hover:border-destructive/50",
			},
			size: {
				default: "h-9 px-4",
				sm: "h-8 px-3 text-xs",
				lg: "h-11 px-5",
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
		VariantProps<typeof buttonVariants> {
	loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant, size, loading, disabled, children, ...props },
		ref,
	) => {
		return (
			<BaseButton
				ref={ref}
				disabled={disabled || loading}
				aria-busy={loading || undefined}
				className={baseClassName(buttonVariants({ variant, size }), className)}
				{...props}
			>
				{loading && <Loader2 className="animate-spin" aria-hidden="true" />}
				{children}
			</BaseButton>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
