"use client";

import React from "react";
import { Panel, PanelHeader, Badge } from "@/components/ui";
import { Globe, ShieldAlert, Target, AlertTriangle, FileText, Building2, DollarSign, CheckCircle2, Activity } from "lucide-react";
import { formatCurrency, formatDate, getDecisionConfig, normalizeDecision } from "@/lib/utils";
import { MandateChecks } from "./MandateChecks";
import { EvidenceBlock, MissingInfo, NextAction, EmailDraft } from "./ContentBlocks";
import { DealActionBar, HumanStatus } from "./ActionBar";
import { CRMPanel, EnrichmentPanel, MandateReevalPanel } from "./StatusPanels";
import type { Deal } from "@/lib/hooks/useDeals";

interface DealHeaderProps {
  deal: Deal;
}

function DealHeader({ deal }: DealHeaderProps) {
  const decision = normalizeDecision(deal.ai_decision);
  const config = getDecisionConfig(decision);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-heading-lg text-foreground truncate">{deal.deal_name}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-body-sm text-muted-foreground">
          <span className="font-mono text-foreground">{deal.lender_name}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="font-mono text-foreground">{formatCurrency(deal.deal_size)}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="capitalize">{deal.source || "webhook"}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>{deal.geography || "—"}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>{deal.industry || "—"}</span>
          {deal.website && (
            <a
              href={deal.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-info hover:text-info-hover text-body-sm font-mono"
            >
              <Globe className="w-3.5 h-3.5" />
              {deal.website}
            </a>
          )}
        </div>
      </div>
      <Badge
        variant="default"
        className={`${config.bg} ${config.border} ${config.text}`}
        size="md"
        dot
      >
        {decision}
      </Badge>
    </div>
  );
}

interface DealInspectorProps {
  deal: Deal | null;
  isSubmitting: boolean;
  onOverride: () => void;
  onRouteToCrm: () => void;
  onEnrichDeal: () => void;
  onApprove: () => void;
  crmRouting?: { loading: boolean; error: string | null } | null;
  enrichment?: { loading: boolean; error: string | null } | null;
  history: Array<{ event_type: string; created_at: string; reason: string | null; previous_decision: string | null; new_decision: string | null }>;
  historyLoading: boolean;
  className?: string;
}

export function DealInspector({
  deal,
  isSubmitting,
  onOverride,
  onRouteToCrm,
  onEnrichDeal,
  onApprove,
  crmRouting,
  enrichment,
  history,
  historyLoading,
  className = "",
}: DealInspectorProps) {
  if (!deal) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-muted-foreground ${className}`}>
        <FileText className="w-12 h-12 mb-4 text-muted-foreground/50" aria-hidden="true" />
        <p className="text-body-md">Select a deal from the queue to inspect</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-4 ${className}`}>
      <DealHeader deal={deal} />
      
      <MandateChecks checks={deal.mandate_checks} />
      
      <EvidenceBlock evidence={deal.evidence} />
      
      <MissingInfo missingInfo={deal.missing_info} />
      
      <NextAction nextAction={deal.next_best_action} />
      
      <EmailDraft emailDraft={deal.email_draft} />
      
      <DealActionBar
        deal={deal}
        isSubmitting={isSubmitting}
        onOverride={onOverride}
        onRouteToCrm={onRouteToCrm}
        onEnrichDeal={onEnrichDeal}
        onApprove={onApprove}
        crmRouting={crmRouting}
        enrichment={enrichment}
      />
      
      <HumanStatus deal={deal} />
      
      <EnrichmentPanel deal={deal} />
      
      <CRMPanel deal={deal} />
      
      <MandateReevalPanel deal={deal} />
      
      <Panel variant="default" padding="md">
        <PanelHeader title="Decision History" icon={<Activity className="w-4 h-4" />} />
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-elevated border border-border animate-pulse rounded" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-body-sm text-center py-4">No history recorded yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((event, i) => (
              <div
                key={`${event.event_type}-${event.created_at}-${i}`}
                className="p-3 bg-surface-elevated border border-border rounded-lg"
              >
                <div className="flex flex-wrap items-center gap-3 text-body-xs">
                  <span className="font-mono text-muted-foreground">{formatDate(event.created_at, { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="px-2 py-0.5 rounded text-label-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground">
                    {event.event_type}
                  </span>
                  {event.previous_decision && (
                    <span className="text-muted-foreground">
                      {event.previous_decision} → <span className="text-foreground font-mono">{event.new_decision}</span>
                    </span>
                  )}
                  {event.reason && (
                    <span className="text-muted-foreground flex-1 truncate">{event.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}