"use client";

import React, { forwardRef } from "react";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const PageShell = forwardRef<HTMLDivElement, PageShellProps>(
  ({ children, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          min-h-screen bg-background text-foreground font-sans
          flex flex-col
          ${className}
        `}
      >
        {children}
      </div>
    );
  }
);

PageShell.displayName = "PageShell";

export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContent = forwardRef<HTMLDivElement, PageContentProps>(
  ({ children, className = "" }, ref) => {
    return (
      <main
        ref={ref}
        className={`
          flex-1 overflow-auto
          ${className}
        `}
      >
        {children}
      </main>
    );
  }
);

PageContent.displayName = "PageContent";

export interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  resizable?: boolean;
  className?: string;
}

export const SplitPane = forwardRef<HTMLDivElement, SplitPaneProps>(
  ({
    left,
    right,
    leftWidth = 320,
    minLeftWidth = 280,
    maxLeftWidth = 480,
    resizable = true,
    className = "",
  }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          flex-1 flex overflow-hidden
          ${className}
        `}
        style={{ height: "calc(100vh - 140px)" }}
      >
        <div
          className={`
            flex-shrink-0 overflow-y-auto border-r border-border bg-surface
            transition-width duration-150 ease-out
          `}
          style={{
            width: `${leftWidth}px`,
            minWidth: `${minLeftWidth}px`,
            maxWidth: `${maxLeftWidth}px`,
          }}
        >
          {left}
        </div>
        {resizable && (
          <div
            className="w-1 cursor-col-resize flex items-center justify-center bg-border hover:bg-border-strong transition-colors"
            role="separator"
            aria-label="Resize panel"
            tabIndex={0}
          >
            <div className="w-px h-8 bg-border-strong rounded-full" />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          {right}
        </div>
      </div>
    );
  }
);

SplitPane.displayName = "SplitPane";

export interface ResponsiveSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
  mobileBreakpoint?: number;
  className?: string;
}

export function ResponsiveSplitPane({
  left,
  right,
  leftWidth = 320,
  mobileBreakpoint = 1024,
  className = "",
}: ResponsiveSplitPaneProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [showDetail, setShowDetail] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      if (!mobile) setShowDetail(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  if (isMobile) {
    return (
      <div className={className} style={{ height: "calc(100vh - 140px)" }}>
        {!showDetail ? (
          <div className="h-full overflow-y-auto">
            {left}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-surface flex items-center justify-between">
              <h2 className="text-heading-sm text-foreground">Deal Details</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Back to queue"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {right}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <SplitPane left={left} right={right} leftWidth={leftWidth} className={className} />
  );
}