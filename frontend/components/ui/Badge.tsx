"use client";

import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  dot?: boolean;
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type BadgeSize = NonNullable<BadgeProps["size"]>;

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground border border-border",
  success: "bg-success-muted text-success-foreground border border-success/30",
  warning: "bg-warning-muted text-warning-foreground border border-warning/30",
  danger: "bg-danger-muted text-danger-foreground border border-danger/30",
  info: "bg-info-muted text-info-foreground border border-info/30",
  neutral: "bg-surface-elevated text-foreground border border-border",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-label-xs gap-1",
  md: "px-2.5 py-1 text-label-sm gap-1.5",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "default", size = "md", dot, className = "", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full border
          transition-colors duration-150
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span
            className={`
              w-1.5 h-1.5 rounded-full flex-shrink-0
              ${variant === "success" && "bg-success"}
              ${variant === "warning" && "bg-warning"}
              ${variant === "danger" && "bg-danger"}
              ${variant === "info" && "bg-info"}
              ${variant === "neutral" && "bg-muted-foreground"}
              ${variant === "default" && "bg-muted-foreground"}
            `}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";