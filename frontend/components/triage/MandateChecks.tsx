"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui";

interface MandateCheckItem {
  key: string;
  label: string;
  passed: boolean;
}

interface MandateChecksProps {
  checks: Record<string, boolean> | null | undefined;
  title?: string;
  className?: string;
}

const checkLabels: Record<string, string> = {
  ebitda_check: "EBITDA",
  leverage_check: "Leverage",
  geography_check: "Geography",
};

export function MandateChecks({ checks, title = "Mandate Checks", className = "" }: MandateChecksProps) {
  if (!checks || Object.keys(checks).length === 0) return null;

  const items: MandateCheckItem[] = Object.entries(checks).map(([key, passed]) => ({
    key,
    label: checkLabels[key] || key.replace("_check", "").replace(/_/g, " "),
    passed,
  }));

  return (
    <Panel variant="default" padding="md" className={className}>
      <PanelHeader title={title} />
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 p-2.5 bg-surface-elevated border border-border rounded-lg"
          >
            {item.passed ? (
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="w-4 h-4 text-danger flex-shrink-0" aria-hidden="true" />
            )}
            <span className="text-body-sm font-medium text-foreground truncate">
              {item.label}
            </span>
            <span className={`text-label-xs font-mono font-medium ${item.passed ? "text-success" : "text-danger"}`}>
              {item.passed ? "PASS" : "FAIL"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}