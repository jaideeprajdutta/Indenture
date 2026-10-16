"use client";

import React from "react";
import { Badge } from "@/components/ui";
import { formatCurrency, getDecisionConfig, normalizeDecision } from "@/lib/utils";
import type { Deal } from "@/lib/hooks/useDeals";

interface DealQueueRowProps {
  deal: Deal;
  isSelected: boolean;
  onClick: () => void;
}

export function DealQueueRow({ deal, isSelected, onClick }: DealQueueRowProps) {
  const decision = normalizeDecision(deal.ai_decision);
  const config = getDecisionConfig(decision);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 rounded-lg transition-all duration-150
        bg-surface border
        ${isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border-strong hover:bg-surface-elevated"
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
      `}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-body-md font-medium text-foreground truncate pr-2">
            {deal.deal_name || "Unknown Deal"}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-body-xs text-muted-foreground">
            <span className="font-mono">{deal.lender_name}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-mono">{formatCurrency(deal.deal_size)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="capitalize">{deal.source || "webhook"}</span>
          </div>
        </div>
        <Badge variant="default" className={config.bg + " " + config.border + " " + config.text} size="sm">
          <span className="relative flex items-center">
            <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: "currentColor" }} aria-hidden="true" />
            {decision}
          </span>
        </Badge>
      </div>
    </button>
  );
}