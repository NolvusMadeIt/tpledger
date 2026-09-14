import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-accent/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
        outline: "border border-border bg-transparent hover:bg-secondary/60",
      },
      size: {
        default: "h-11 rounded-md px-4 text-sm",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 rounded-md px-5 text-sm",
        icon: "size-11 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
