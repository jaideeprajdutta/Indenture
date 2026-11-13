"use client";

import React, { forwardRef } from "react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
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
          sticky top-0 z-50 px-3 pt-4 pb-2 sm:px-4 sm:pt-5
          ${className}
        `}
      >
        <div
          className="
            max-w-6xl mx-auto
            bg-surface-elevated/95 backdrop-blur-md
            border border-border
            rounded-full
            shadow-[0_4px_24px_0_rgba(0,0,0,0.04)]
            px-4 py-2 sm:px-6
            flex flex-wrap items-center justify-between gap-2
          "
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isBrand && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
            )}
            {icon && (
              <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {isBrand ? (
                <Link
                  href={brandHref}
                  className="text-heading-lg text-foreground tracking-tight hover:text-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
                  aria-label="Indenture home"
                >
                  <h1 className="text-heading-lg text-inherit leading-none py-1">INDENTURE</h1>
                </Link>
              ) : (
                <>
                  <h1 className="text-heading-lg text-foreground leading-none py-1">{title}</h1>
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
                      flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                      text-label-sm font-medium transition-colors duration-150
                      ${item.active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
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
        role="group"
        aria-label="Deal filters"
      >
        {filters.map((filter) => (
          <button
            key={filter.key}
            aria-pressed={activeKey === filter.key}
            onClick={() => onChange(filter.key)}
            className={`
              px-3.5 py-1.5 rounded-full text-label-xs font-semibold tracking-wider
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
              ${activeKey === filter.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }
            `}
          >
            {filter.label}
            {filter.count !== undefined && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                activeKey === filter.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
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