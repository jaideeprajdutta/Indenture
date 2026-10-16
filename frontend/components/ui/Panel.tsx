"use client";

import React, { forwardRef } from "react";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "sunken" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

type PanelVariant = NonNullable<PanelProps["variant"]>;
type PanelPadding = NonNullable<PanelProps["padding"]>;

const variantStyles: Record<PanelVariant, string> = {
  default: "bg-surface border border-border",
  elevated: "bg-surface-elevated border border-border",
  sunken: "bg-surface-sunken border border-border",
  bordered: "bg-transparent border border-border-strong",
};

const paddingStyles: Record<PanelPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ children, variant = "default", padding = "md", hover = false, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-lg transition-all duration-150 ease-out
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hover && "hover:border-border-strong hover:shadow-md"}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = "Panel";

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ title, description, action, icon, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex items-start justify-between gap-4 mb-4
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && <span className="flex-shrink-0 text-muted-foreground" aria-hidden="true">{icon}</span>}
          <div>
            <h3 className="text-heading-sm text-foreground truncate">{title}</h3>
            {description && (
              <p className="text-body-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0 ml-4">{action}</div>}
      </div>
    );
  }
);

PanelHeader.displayName = "PanelHeader";

export interface PanelSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  divider?: boolean;
}

export const PanelSection = forwardRef<HTMLDivElement, PanelSectionProps>(
  ({ children, title, divider = true, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          ${divider && "pt-4 border-t border-border"}
          ${className}
        `}
        {...props}
      >
        {title && (
          <h4 className="text-label-sm text-muted-foreground mb-3">{title}</h4>
        )}
        {children}
      </div>
    );
  }
);

PanelSection.displayName = "PanelSection";