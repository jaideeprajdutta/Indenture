"use client";

import React from "react";
import { Button } from "@/components/ui";
import { Settings, Activity, Globe, Check, Loader2, Activity as ActivityIcon } from "lucide-react";
import type { Deal } from "@/lib/hooks/useDeals";

interface ActionBarProps {
  deal: Deal;
  isSubmitting: boolean;
  onOverride: () => void;
  onRouteToCrm: () => void;
  onEnrichDeal: () => void;
  onApprove: () => void;
  crmRouting?: { loading: boolean; error: string | null } | null;
  enrichment?: { loading: boolean; error: string | null } | null;
  className?: string;
}

export function DealActionBar({
  deal,
  isSubmitting,
  onOverride,
  onRouteToCrm,
  onEnrichDeal,
  onApprove,
  crmRouting,
  enrichment,
  className = "",
}: ActionBarProps) {
  const isPending = deal.human_status === "PENDING";

  if (!isPending) return null;

  return (
    <div className={`flex flex-wrap gap-3 pt-4 border-t border-border ${className}`}>
      <Button
        variant="outline"
        icon={<Settings className="w-4 h-4" />}
        onClick={onOverride}
        disabled={isSubmitting}
        className="gap-2"
      >
        Override
      </Button>
      <Button
        variant="outline"
        icon={crmRouting?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ActivityIcon className="w-4 h-4" />}
        onClick={onRouteToCrm}
        disabled={isSubmitting || crmRouting?.loading}
        className="gap-2 border-info text-info hover:bg-info-muted"
      >
        Route to CRM
      </Button>
      <Button
        variant="outline"
        icon={enrichment?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        onClick={onEnrichDeal}
        disabled={isSubmitting || enrichment?.loading}
        className="gap-2 border-warning text-warning hover:bg-warning-muted"
      >
        Enrich Deal
      </Button>
      <Button
        variant="success"
        icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        onClick={onApprove}
        disabled={isSubmitting}
        className="gap-2"
      >
        {isSubmitting ? "Processing..." : "Approve & Advance"}
      </Button>
      {crmRouting?.error && (
        <span className="flex items-center px-3 py-1.5 text-label-xs text-danger font-mono bg-danger-muted border border-danger/30 rounded-md self-center">
          CRM Error: {crmRouting.error}
        </span>
      )}
      {enrichment?.error && (
        <span className="flex items-center px-3 py-1.5 text-label-xs text-danger font-mono bg-danger-muted border border-danger/30 rounded-md self-center">
          Enrichment Error: {enrichment.error}
        </span>
      )}
    </div>
  );
}

interface HumanStatusProps {
  deal: Deal;
  className?: string;
}

export function HumanStatus({ deal, className = "" }: HumanStatusProps) {
  if (deal.human_status === "PENDING") return null;

  const status = deal.human_status;
  const config = {
    APPROVED: { bg: "bg-success-muted", border: "border-success/30", text: "text-success-foreground", label: "APPROVED" },
    OVERRIDDEN: { bg: "bg-info-muted", border: "border-info/30", text: "text-info-foreground", label: "OVERRIDDEN" },
    REJECTED: { bg: "bg-danger-muted", border: "border-danger/30", text: "text-danger-foreground", label: "REJECTED" },
  }[status] || { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", label: status };

  return (
    <div className={`pt-4 border-t border-border ${className}`}>
      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} ${config.border}`}>
        <span className={`px-2.5 py-1 rounded text-label-xs font-bold uppercase tracking-wider ${config.text}`}>
          {config.label}
        </span>
        {deal.human_decision && (
          <span className="text-body-sm font-mono text-foreground">
            Decision: {deal.human_decision}
          </span>
        )}
        {deal.override_reason && (
          <span className="text-body-sm text-muted-foreground italic ml-auto">
            "{deal.override_reason}"
          </span>
        )}
      </div>
    </div>
  );
}