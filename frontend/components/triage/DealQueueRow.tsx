"use client";

import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatCurrency, getDecisionConfig, normalizeDecision } from "@/lib/utils";
import type { Deal } from "@/lib/hooks/useDeals";

/** Whole days an opportunity has been waiting since it entered the pipeline. */
function ageInDays(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

interface DealQueueRowProps {
  deal: Deal;
  isSelected: boolean;
  onClick: () => void;
}

export function DealQueueRow({ deal, isSelected, onClick }: DealQueueRowProps) {
  const decision = normalizeDecision(deal.ai_decision);
  const config = getDecisionConfig(decision);

  const isPending = (deal.human_status || "PENDING") === "PENDING";
  const needsInfo = isPending && Boolean(deal.missing_info && deal.missing_info.trim());
  const ageDays = ageInDays(deal.created_at);
  const staleReview = isPending && ageDays >= 7;

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
            {deal.deal_name || "Unknown Opportunity"}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-body-xs text-muted-foreground">
            <span className="font-mono">{deal.lender_name}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-mono">{formatCurrency(deal.deal_size)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="capitalize">{deal.source || "webhook"}</span>
            {needsInfo && (
              <span className="flex items-center gap-1 text-warning">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Needs info
              </span>
            )}
            {staleReview && (
              <span className="flex items-center gap-1 text-danger">
                <Clock className="w-3 h-3" aria-hidden="true" />
                In review {ageDays}d
              </span>
            )}
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
