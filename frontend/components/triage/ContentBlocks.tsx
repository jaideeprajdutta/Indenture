"use client";

import React from "react";
import { Panel, PanelHeader } from "@/components/ui";

interface ContentBlockProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "warning" | "info" | "success";
  className?: string;
  emptyMessage?: string;
}

const variantStyles = {
  default: "bg-surface-elevated border-border",
  warning: "bg-warning-muted border-warning/30",
  info: "bg-info-muted border-info/30",
  success: "bg-success-muted border-success/30",
};

const iconStyles = {
  default: "text-muted-foreground",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

export function ContentBlock({ title, icon, children, variant = "default", className = "", emptyMessage = "No data available" }: ContentBlockProps) {
  const hasContent = React.Children.count(children) > 0 || (typeof children === "string" && children.trim().length > 0);

  return (
    <Panel variant="bordered" padding="md" className={className}>
      <PanelHeader
        title={title}
        className="flex items-center gap-2"
      >
        {icon && <span className={iconStyles[variant]} aria-hidden="true">{icon}</span>}
      </PanelHeader>
      <div className={`${variantStyles[variant]} rounded-lg p-3 font-mono text-body-sm whitespace-pre-wrap`}>
        {hasContent ? children : (
          <span className="text-muted-foreground">{emptyMessage}</span>
        )}
      </div>
    </Panel>
  );
}

export function EvidenceBlock({ evidence, className = "" }: { evidence: string | null | undefined; className?: string }) {
  return (
    <ContentBlock
      title="AI Evidence"
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      className={className}
      emptyMessage="No evidence recorded."
    >
      {evidence}
    </ContentBlock>
  );
}

export function MissingInfo({ missingInfo, className = "" }: { missingInfo: string | null | undefined; className?: string }) {
  if (!missingInfo?.trim()) return null;
  
  return (
    <ContentBlock
      title="Missing Information"
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      variant="warning"
      className={className}
      emptyMessage=""
    >
      {missingInfo}
    </ContentBlock>
  );
}

export function NextAction({ nextAction, className = "" }: { nextAction: string | null | undefined; className?: string }) {
  if (!nextAction?.trim()) return null;
  
  return (
    <ContentBlock
      title="Next Best Action"
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>}
      variant="info"
      className={className}
      emptyMessage=""
    >
      {nextAction}
    </ContentBlock>
  );
}

export function EmailDraft({ emailDraft, className = "" }: { emailDraft: string | null | undefined; className?: string }) {
  return (
    <ContentBlock
      title="Email Draft"
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      className={className}
      emptyMessage="No draft generated."
    >
      {emailDraft}
    </ContentBlock>
  );
}