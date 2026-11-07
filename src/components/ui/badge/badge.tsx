import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
	{
		variants: {
			variant: {
				default: "border-primary/30 text-primary bg-primary/10",
				"accent-warm":
					"border-accent-warm/30 text-accent-warm bg-accent-warm/10",
				"accent-cool":
					"border-accent-cool/30 text-accent-cool bg-accent-cool/10",
				destructive: "border-destructive/30 text-destructive bg-destructive/10",
				outline: "border-glass-border text-muted-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	);
};

export { Badge, badgeVariants };
