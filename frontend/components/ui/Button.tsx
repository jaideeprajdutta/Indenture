"use client";

import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

type ButtonVariant = NonNullable<ButtonProps["variant"]>;
type ButtonSize = NonNullable<ButtonProps["size"]>;

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary/90",
  secondary: "bg-surface-elevated text-foreground border border-border hover:bg-surface-sunken active:bg-surface",
  ghost: "bg-transparent text-foreground hover:bg-muted active:bg-muted/80",
  danger: "bg-danger text-danger-foreground hover:bg-danger-hover active:bg-danger/90",
  success: "bg-success text-success-foreground hover:bg-success-hover active:bg-success/90",
  outline: "bg-transparent text-foreground border border-border hover:bg-surface-elevated active:bg-surface",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-label-sm gap-1.5",
  md: "px-4 py-2 text-label-md gap-2",
  lg: "px-5 py-2.5 text-label-lg gap-2",
  icon: "p-2 text-label-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium rounded-md
          transition-colors duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : icon && iconPosition === "left" ? (
          <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        ) : null}
        <span className={loading ? "opacity-0" : ""}>{children}</span>
        {icon && iconPosition === "right" && !loading && (
          <span className="flex-shrink-0 ml-1" aria-hidden="true">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";