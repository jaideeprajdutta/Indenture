"use client";

import React, { forwardRef } from "react";

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: "default" | "pills" | "underline";
  fullWidth?: boolean;
  className?: string;
}

const variantStyles = {
  default: "bg-surface border border-border rounded-full p-1",
  pills: "bg-transparent",
  underline: "bg-transparent border-b border-border",
};

const tabStyles = {
  default: "rounded-full px-3 py-1.5 text-label-sm font-medium transition-all duration-150 data-[state=active]:bg-surface-elevated data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  pills: "rounded-full px-4 py-2 text-label-md font-medium transition-all duration-150 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
  underline: "px-4 py-3 text-label-md font-medium border-b-2 transition-all duration-150 data-[state=active]:border-primary data-[state=active]:text-foreground border-transparent text-muted-foreground",
};

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, activeKey, onChange, variant = "default", fullWidth = false, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex gap-1
          ${variantStyles[variant]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        role="tablist"
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeKey === tab.key}
            aria-disabled={tab.disabled}
            aria-controls={`${tab.key}-panel`}
            id={`${tab.key}-trigger`}
            onClick={() => !tab.disabled && onChange(tab.key)}
            disabled={tab.disabled}
            className={`
              flex items-center justify-center gap-2 min-w-0
              ${tabStyles[variant]}
              ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${fullWidth ? "flex-1" : ""}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
            `}
            data-state={activeKey === tab.key ? "active" : "inactive"}
          >
            {tab.icon && <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium
                ${activeKey === tab.key
                  ? variant === "pills"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

Tabs.displayName = "Tabs";

export interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export const TabPanels = forwardRef<HTMLDivElement, TabPanelsProps>(
  ({ children, className = "", ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }
);

TabPanels.displayName = "TabPanels";

export interface TabPanelProps {
  tabKey: string;
  children: React.ReactNode;
  activeKey: string;
  className?: string;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ tabKey, children, activeKey, className = "", ...props }, ref) => {
    const isActive = activeKey === tabKey;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        id={`${tabKey}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabKey}-trigger`}
        className={`
          animate-in
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabPanel.displayName = "TabPanel";