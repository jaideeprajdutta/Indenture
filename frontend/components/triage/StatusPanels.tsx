"use client";

import React from "react";
import { Panel, PanelHeader } from "@/components/ui";
import { Activity, CheckCircle2, XCircle, Globe } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Deal } from "@/lib/hooks/useDeals";

interface CRMPanelProps {
  deal: Deal;
  className?: string;
}

export function CRMPanel({ deal, className = "" }: CRMPanelProps) {
  if (!deal.crm_status || (deal.crm_status !== "ROUTED" && deal.crm_status !== "FAILED")) {
    return null;
  }

  const isRouted = deal.crm_status === "ROUTED";
  const statusConfig = isRouted
    ? { bg: "bg-success-muted", border: "border-success/30", text: "text-success-foreground", label: deal.crm_record_id?.startsWith("SIM-") ? "Simulated" : "Routed" }
    : { bg: "bg-danger-muted", border: "border-danger/30", text: "text-danger-foreground", label: "Failed" };

  return (
    <Panel variant="default" padding="md" className={className}>
      <PanelHeader
        title="CRM Routing"
        icon={<Activity className="w-4 h-4" />}
      />
      <div className="bg-surface-elevated border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-4 text-body-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-mono text-foreground">{deal.crm_provider || "—"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status:</span>
            <span className={`px-2 py-0.5 rounded text-label-xs font-bold uppercase tracking-wider font-mono ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </span>
          {deal.crm_record_id && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Record ID:</span>
              <span className="font-mono text-foreground">{deal.crm_record_id}</span>
            </span>
          )}
          {deal.crm_routed_at && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Routed:</span>
              <span className="font-mono text-foreground text-label-xs">{formatDate(deal.crm_routed_at)}</span>
            </span>
          )}
          {deal.crm_error && (
            <span className="flex items-center gap-1.5 text-danger">
              <span className="text-muted-foreground">Error:</span>
              <span className="font-mono text-body-xs">{deal.crm_error}</span>
            </span>
          )}
        </div>
        {(deal.human_decision || deal.ai_decision) && (
          <p className="mt-3 text-label-sm text-muted-foreground">
            Routed decision:{' '}
            <span className="font-mono text-foreground">
              {deal.human_decision ? `${deal.human_decision} (overridden)` : `${deal.ai_decision} (AI)`}
            </span>
          </p>
        )}
      </div>
    </Panel>
  );
}

interface EnrichmentPanelProps {
  deal: Deal;
  className?: string;
}

export function EnrichmentPanel({ deal, className = "" }: EnrichmentPanelProps) {
  if (!deal.enrichment_status || (deal.enrichment_status !== "ENRICHED" && deal.enrichment_status !== "FAILED")) {
    return null;
  }

  const isEnriched = deal.enrichment_status === "ENRICHED";
  const statusConfig = isEnriched
    ? { bg: "bg-success-muted", border: "border-success/30", text: "text-success-foreground", label: "Enriched" }
    : { bg: "bg-danger-muted", border: "border-danger/30", text: "text-danger-foreground", label: "Failed" };

  return (
    <Panel variant="default" padding="md" className={className}>
      <PanelHeader
        title="Enrichment"
        icon={<Globe className="w-4 h-4" />}
      />
      <div className="bg-surface-elevated border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-4 text-body-sm mb-3">
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Source:</span>
            <span className="font-mono text-foreground">{deal.enrichment_source || "—"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status:</span>
            <span className={`px-2 py-0.5 rounded text-label-xs font-bold uppercase tracking-wider font-mono ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
          </span>
          {deal.enrichment_confidence && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Confidence:</span>
              <span className="font-mono text-foreground">{(deal.enrichment_confidence * 100).toFixed(0)}%</span>
            </span>
          )}
          {deal.enriched_at && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Enriched:</span>
              <span className="font-mono text-foreground text-label-xs">{formatDate(deal.enriched_at)}</span>
            </span>
          )}
        </div>
        
        {isEnriched && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-border">
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-label-xs text-muted-foreground font-mono">Website</span>
              <div className="text-body-sm text-foreground font-mono truncate">
                {deal.website || "—"}
              </div>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-label-xs text-muted-foreground font-mono">Revenue</span>
              <div className="text-body-sm text-foreground font-mono">
                {formatCurrency(deal.revenue)}
              </div>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-label-xs text-muted-foreground font-mono">Employees</span>
              <div className="text-body-sm text-foreground font-mono">
                {deal.employee_count ? deal.employee_count.toLocaleString() : "—"}
              </div>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-label-xs text-muted-foreground font-mono">Ownership</span>
              <div className="text-body-sm text-foreground font-mono">
                {deal.ownership_type || "—"}
              </div>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-label-xs text-muted-foreground font-mono">Txn Type</span>
              <div className="text-body-sm text-foreground font-mono">
                {deal.transaction_type || "—"}
              </div>
            </div>
          </div>
        )}

        {!isEnriched && (
          <div className="mt-3 text-danger text-body-sm font-mono">
            Enrichment failed - check Decision History for details
          </div>
        )}
      </div>
    </Panel>
  );
}

interface MandateReevalPanelProps {
  deal: Deal;
  className?: string;
}

export function MandateReevalPanel({ deal, className = "" }: MandateReevalPanelProps) {
  if (!deal.mandate_reevaluation) return null;

  const reevaluation = deal.mandate_reevaluation as {
    before: { ebitda_check: boolean; leverage_check: boolean; geography_check: boolean; eligible: boolean };
    after: { ebitda_check: boolean; leverage_check: boolean; geography_check: boolean; eligible: boolean };
    eligibility_changed: boolean;
  };

  const checkItems = [
    { key: "ebitda_check", label: "EBITDA Check" },
    { key: "leverage_check", label: "Leverage Check" },
    { key: "geography_check", label: "Geography Check" },
  ];

  return (
    <Panel variant="default" padding="md" className={className}>
      <PanelHeader
        title="Mandate Re-evaluation"
        icon={<Activity className="w-4 h-4" />}
      />
      <div className="bg-surface-elevated border border-border rounded-lg p-3">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="p-2.5 bg-surface border border-border rounded-lg">
            <span className="text-label-xs text-muted-foreground uppercase tracking-wider">Before</span>
            <div className="flex flex-col gap-1 mt-2 text-body-sm">
              {checkItems.map((item) => (
                <span key={item.key} className={`flex items-center gap-1.5 ${reevaluation.before[item.key as keyof typeof reevaluation.before] ? "text-success" : "text-danger"}`}>
                  {reevaluation.before[item.key as keyof typeof reevaluation.before] ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {item.label}
                </span>
              ))}
              <span className={`flex items-center gap-1.5 font-bold ${reevaluation.before.eligible ? "text-success" : "text-danger"}`}>
                {reevaluation.before.eligible ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Eligible: {reevaluation.before.eligible ? "YES" : "NO"}
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-surface border border-border rounded-lg">
            <span className="text-label-xs text-muted-foreground uppercase tracking-wider">After Enrichment</span>
            <div className="flex flex-col gap-1 mt-2 text-body-sm">
              {checkItems.map((item) => (
                <span key={item.key} className={`flex items-center gap-1.5 ${reevaluation.after[item.key as keyof typeof reevaluation.after] ? "text-success" : "text-danger"}`}>
                  {reevaluation.after[item.key as keyof typeof reevaluation.after] ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {item.label}
                </span>
              ))}
              <span className={`flex items-center gap-1.5 font-bold ${reevaluation.after.eligible ? "text-success" : "text-danger"}`}>
                {reevaluation.after.eligible ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Eligible: {reevaluation.after.eligible ? "YES" : "NO"}
              </span>
            </div>
          </div>
        </div>

        {reevaluation.eligibility_changed && (
          <div className="p-2.5 bg-warning-muted border border-warning/30 rounded-lg text-warning-foreground text-body-sm">
            <strong>Eligibility changed:</strong> {reevaluation.before.eligible ? "Was eligible, now ineligible" : "Was ineligible, now eligible"}
          </div>
        )}
      </div>
    </Panel>
  );
}