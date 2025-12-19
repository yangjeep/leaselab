import * as React from "react";
import { cn } from "../../lib/utils";

const VARIANT_STYLES = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  outline: "border-border text-foreground",
  success: "border-transparent bg-green-100 text-green-800",
  warning: "border-transparent bg-yellow-100 text-yellow-800",
  info: "border-transparent bg-blue-100 text-blue-800",
} as const;

export type BadgeVariant = keyof typeof VARIANT_STYLES;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    />
  );
}
