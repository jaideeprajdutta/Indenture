"use client";

import React, { forwardRef } from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  statusItems?: Array<{
    label: string;
    icon?: React.ReactNode;
    status?: "connected" | "warning" | "error";
  }>;
  navigation?: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    active?: boolean;
  }>;
  className?: string;
  brandHref?: string;
}

export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      title,
      icon,
      subtitle,
      actions,
      statusItems,
      navigation,
      className = "",
      brandHref = "/",
    },
    ref
  ) => {
    const isBrand = title?.toUpperCase().startsWith("INDENTURE");

    return (
      <header
        ref={ref}
        className={`
          sticky top-0 z-50
          bg-background/90 backdrop-blur-md border-b border-border/80
          ${className}
        `}
      >
        <div className="px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {icon}
                </span>
              )}
              <div>
                {isBrand ? (
                  <Link
                    href={brandHref}
                    className="text-heading-lg text-foreground tracking-wide hover:text-foreground/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                    aria-label="Indenture home"
                  >
                    <h1 className="text-heading-lg text-inherit">INDENTURE</h1>
                  </Link>
                ) : (
                  <>
                    <h1 className="text-heading-lg text-foreground">{title}</h1>
                    {subtitle && (
                      <p className="text-body-sm text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                  </>
                )}
                {isBrand && subtitle && (
                  <p className="text-body-sm text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {navigation && navigation.length > 0 && (
                <nav className="flex items-center gap-1" aria-label="Page navigation">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                        className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                        text-label-sm font-medium transition-colors duration-150
                        ${item.active
                          ? "bg-surface-elevated text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/80"
                        }
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      `}
                      aria-current={item.active ? "page" : undefined}
                    >
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>

          {(statusItems && statusItems.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-caption font-mono text-muted-foreground">
              {statusItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  <span className={item.status === "connected" ? "text-success" : item.status === "warning" ? "text-warning" : item.status === "error" ? "text-danger" : ""}>
                    {item.label}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </header>
    );
  }
);

PageHeader.displayName = "PageHeader";

export interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          px-4 py-2 border-b border-border/80 bg-background/70 backdrop-blur-sm
          flex flex-wrap items-center justify-between gap-3
          ${className}
        `}
      >
        {children}
      </div>
    );
  }
);

ActionBar.displayName = "ActionBar";

export interface FilterTabsProps {
  filters: Array<{ key: string; label: string; count?: number }>;
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const FilterTabs = forwardRef<HTMLDivElement, FilterTabsProps>(
  ({ filters, activeKey, onChange, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex flex-wrap gap-1
          ${className}
        `}
        role="tablist"
      >
        {filters.map((filter) => (
          <button
            key={filter.key}
            role="tab"
            aria-selected={activeKey === filter.key}
            onClick={() => onChange(filter.key)}
            className={`
              px-3 py-1.5 rounded-lg text-label-xs font-semibold tracking-wider
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${activeKey === filter.key
                ? "bg-surface-elevated text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated/80"
              }
            `}
          >
            {filter.label}
            {filter.count !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted text-muted-foreground">
                {filter.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

FilterTabs.displayName = "FilterTabs";