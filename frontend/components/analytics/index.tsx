"use client";

import React from "react";
import { Panel, Badge, PanelHeader } from "@/components/ui";
import { formatCurrency, getDecisionConfig, normalizeDecision } from "@/lib/utils";

interface AnalyticsData {
  total_deals: number;
  advance_pct: number;
  hold_pct: number;
  nurture_pct: number;
  reject_pct: number;
  avg_deal_size: number;
  deals_by_source: Record<string, number>;
  advanced_by_source: Record<string, number>;
  rejected_by_source: Record<string, number>;
}

export function MetricCard({ label, value, color }: { label: string; value: string | number; color?: "success" | "warning" | "info" | "danger" }) {
  const colorMap = {
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    danger: "text-danger",
  };

  return (
    <Panel variant="default" padding="md">
      <p className="text-label-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-heading-lg font-bold font-mono ${colorMap[color || "success"]}`}>{value}</p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline health & follow-up prioritization                          */
/* Computed client-side from the existing deal log — no fabricated      */
/* metrics, no new endpoints. Every item carries the reason it is       */
/* being surfaced.                                                     */
/* ------------------------------------------------------------------ */

export interface DealLogRow {
  id: number;
  deal_name: string;
  lender_name: string;
  deal_size: number | null;
  source: string | null;
  ai_decision: string;
  human_status: string;
  human_decision: string | null;
  missing_info: string | null;
  next_best_action: string | null;
  crm_status: string | null;
  crm_error: string | null;
  created_at: string;
}

const DAY_MS = 86_400_000;
const severityRank = { high: 0, medium: 1, low: 2 } as const;
const severityStyles = {
  high: { dot: "bg-danger", label: "text-danger" },
  medium: { dot: "bg-warning", label: "text-warning" },
  low: { dot: "bg-info", label: "text-info" },
} as const;

interface AttentionItem {
  deal: DealLogRow;
  reason: string;
  severity: keyof typeof severityRank;
  ageDays: number;
}

export function PipelineHealth({ deals }: { deals: DealLogRow[] }) {
  // Captured once at mount so re-renders don't shift the "days waiting" figures.
  const [now] = React.useState(() => Date.now());
  const ageDays = (d: DealLogRow) =>
    Math.max(0, Math.floor((now - new Date(d.created_at).getTime()) / DAY_MS));

  const pending = deals.filter((d) => (d.human_status || "PENDING") === "PENDING");
  const stuckReview = pending.filter((d) => ageDays(d) >= 7);
  const decided = deals.filter((d) => d.human_status === "APPROVED" || d.human_status === "OVERRIDDEN");
  const awaitingHandoff = decided.filter(
    (d) => !d.crm_status && normalizeDecision(d.ai_decision) !== "REJECT"
  );
  const handoffFailed = deals.filter((d) => d.crm_status === "FAILED");
  const holdPending = pending.filter((d) => normalizeDecision(d.ai_decision) === "HOLD");

  /* Follow-up prioritization: failed handoffs first (broken work), then
     decisions waiting on their handoff, then stale reviews, then HOLDs
     blocked on missing information. Oldest first within a tier. */
  const attention: AttentionItem[] = [];
  const seen = new Set<number>();
  const push = (deal: DealLogRow, reason: string, severity: AttentionItem["severity"]) => {
    if (seen.has(deal.id)) return;
    seen.add(deal.id);
    attention.push({ deal, reason, severity, ageDays: ageDays(deal) });
  };

  for (const d of handoffFailed) {
    push(d, d.crm_error ? `CRM handoff failed — ${d.crm_error}` : "CRM handoff failed — needs retry", "high");
  }
  for (const d of awaitingHandoff) {
    push(d, `Decision made (${d.human_status.toLowerCase()}) — pending CRM handoff`, "medium");
  }
  for (const d of stuckReview) {
    push(d, `Awaiting review for ${ageDays(d)} days`, ageDays(d) >= 14 ? "high" : "medium");
  }
  for (const d of holdPending) {
    const info = d.missing_info && d.missing_info.trim() ? `Missing: ${d.missing_info.trim()}` : "Missing information blocking progress";
    push(d, `AI recommends HOLD — ${info}`, "low");
  }

  attention.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.ageDays - a.ageDays
  );
  const visible = attention.slice(0, 5);
  const remaining = attention.length - visible.length;

  return (
    <Panel variant="default" padding="md">
      <PanelHeader
        title="Pipeline Health"
        description="Bottlenecks and outstanding work, prioritized by operational impact"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-heading-md font-mono font-bold text-warning">{stuckReview.length}</p>
          <p className="text-label-xs text-muted-foreground">Stuck in review (7d+)</p>
        </div>
        <div>
          <p className="text-heading-md font-mono font-bold text-info">{awaitingHandoff.length}</p>
          <p className="text-label-xs text-muted-foreground">Awaiting CRM handoff</p>
        </div>
        <div>
          <p className="text-heading-md font-mono font-bold text-danger">{handoffFailed.length}</p>
          <p className="text-label-xs text-muted-foreground">Handoff failures</p>
        </div>
        <div>
          <p className="text-heading-md font-mono font-bold text-warning">{holdPending.length}</p>
          <p className="text-label-xs text-muted-foreground">HOLD — info missing</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-label-xs text-muted-foreground uppercase tracking-wider mb-3">
          Needs attention first
        </h4>
        {visible.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-2">
            No operational bottlenecks — every decision has a clear next step.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map(({ deal, reason, severity }) => {
              const styles = severityStyles[severity];
              return (
                <li key={deal.id} className="flex items-start gap-3 py-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${styles.dot}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-foreground truncate">{deal.deal_name}</p>
                    <p className={`text-label-xs ${styles.label}`}>{reason}</p>
                  </div>
                  <span className="flex-shrink-0 text-label-xs text-muted-foreground font-mono">
                    {deal.lender_name} · {ageDays(deal)}d
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {remaining > 0 && (
          <p className="mt-2 text-label-xs text-muted-foreground">
            + {remaining} more item{remaining === 1 ? "" : "s"} not shown
          </p>
        )}
      </div>
    </Panel>
  );
}

interface DecisionBarProps {
  label: string;
  pct: number;
  color: "success" | "warning" | "info" | "danger";
}

export function DecisionBars({ label, pct, color }: DecisionBarProps) {
  const colorMap = {
    success: { bg: "bg-success", text: "text-success" },
    warning: { bg: "bg-warning", text: "text-warning" },
    info: { bg: "bg-info", text: "text-info" },
    danger: { bg: "bg-danger", text: "text-danger" },
  };
  const c = colorMap[color];

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-body-sm">
        <span className={`font-medium ${c.text}`}>{label}</span>
        <span className="font-mono text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={`h-full ${c.bg} transition-all duration-300 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DecisionDistribution({ analytics }: { analytics: AnalyticsData }) {
  return (
    <Panel variant="default" padding="md">
      <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3">Decision Distribution</h3>
      <div className="space-y-3">
        <DecisionBars label="ADVANCE" pct={analytics.advance_pct} color="success" />
        <DecisionBars label="HOLD" pct={analytics.hold_pct} color="warning" />
        <DecisionBars label="NURTURE" pct={analytics.nurture_pct} color="info" />
        <DecisionBars label="REJECT" pct={analytics.reject_pct} color="danger" />
      </div>
    </Panel>
  );
}

export function SourceBars({ analytics }: { analytics: AnalyticsData }) {
  const sources = Object.entries(analytics.deals_by_source);

  if (sources.length === 0) {
    return (
      <Panel variant="default" padding="md">
        <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3">Opportunities by Source</h3>
        <p className="text-muted-foreground text-body-sm text-center py-6">No source data available</p>
      </Panel>
    );
  }

  return (
    <Panel variant="default" padding="md">
      <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3">Opportunities by Source</h3>
      <div className="space-y-3">
        {sources.map(([source, count]) => {
          const advanced = analytics.advanced_by_source[source] || 0;
          const rate = count > 0 ? Math.round(advanced / count * 100) : 0;
          return (
            <div key={source} className="space-y-1">
              <div className="flex justify-between text-body-sm">
                <span className="font-medium text-foreground capitalize">{source}</span>
                <span className="font-mono text-muted-foreground">{count} opportunities</span>
              </div>
              <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-success/50 transition-all duration-300 ease-out"
                  style={{ width: `${rate}%` }}
                />
              </div>
              <div className="flex justify-between text-label-xs text-muted-foreground">
                <span>Advanced: {advanced}</span>
                <span className="text-success">{rate}% advance rate</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

interface SourceTableRow {
  source: string;
  total: number;
  advanced: number;
  rejected: number;
  advanceRate: number;
  rejectRate: number;
  avgSize: number;
}

export function SourceTable({ analytics, deals }: { analytics: AnalyticsData; deals: Array<{ source: string | null; deal_size: number | null }> }) {
  const sources = Object.entries(analytics.deals_by_source);

  if (sources.length === 0) {
    return (
      <Panel variant="default" padding="none">
        <div className="p-4">
          <p className="text-muted-foreground text-body-sm text-center py-6">No source data available</p>
        </div>
      </Panel>
    );
  }

  const rows: SourceTableRow[] = sources.map(([source, total]) => {
    const advanced = analytics.advanced_by_source[source] || 0;
    const rejected = analytics.rejected_by_source[source] || 0;
    const advanceRate = total > 0 ? Math.round(advanced / total * 100) : 0;
    const rejectRate = total > 0 ? Math.round(rejected / total * 100) : 0;
    const sourceDeals = deals.filter(d => d.source === source && d.deal_size);
    const avgSize = sourceDeals.length > 0
      ? sourceDeals.reduce((sum, d) => sum + (d.deal_size || 0), 0) / sourceDeals.length
      : 0;
    return { source, total, advanced, rejected, advanceRate, rejectRate, avgSize };
  });

  return (
    <Panel variant="default" padding="none">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Source Performance
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Source</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Total</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Advanced</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Rejected</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Adv Rate</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Rej Rate</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider text-right whitespace-nowrap">Avg Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.source} className="border-b border-border/50 hover:bg-surface-elevated/50">
                <td className="px-4 py-2.5 font-mono text-foreground capitalize whitespace-nowrap">{row.source}</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">{row.total}</td>
                <td className="px-4 py-2.5 text-right font-mono text-success whitespace-nowrap">{row.advanced}</td>
                <td className="px-4 py-2.5 text-right font-mono text-danger whitespace-nowrap">{row.rejected}</td>
                <td className="px-4 py-2.5 text-right font-mono text-success whitespace-nowrap">{row.advanceRate}%</td>
                <td className="px-4 py-2.5 text-right font-mono text-danger whitespace-nowrap">{row.rejectRate}%</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted-foreground whitespace-nowrap">{formatCurrency(row.avgSize)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function DealLogTable({ deals }: { deals: DealLogRow[] }) {
  if (deals.length === 0) {
    return (
      <Panel variant="default" padding="none">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            All Opportunities
            <span className="text-label-xs text-muted-foreground font-mono">{deals.length} records</span>
          </h3>
        </div>
        <div className="p-8 text-center">
          <p className="text-muted-foreground text-body-sm">No opportunities recorded yet</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel variant="default" padding="none">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>All Opportunities</span>
          <span className="text-label-xs text-muted-foreground font-mono">{deals.length} records</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Deal</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Lender</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Decision</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Size</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Source</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 font-medium text-label-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => {
              const config = getDecisionConfig(deal.ai_decision);
              const statusConfig = {
                APPROVED: { bg: "bg-success-muted", border: "border-success/30", text: "text-success", label: "Approved" },
                OVERRIDDEN: { bg: "bg-info-muted", border: "border-info/30", text: "text-info", label: "Overridden" },
                REJECTED: { bg: "bg-danger-muted", border: "border-danger/30", text: "text-danger", label: "Rejected" },
                PENDING: { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", label: "Awaiting review" },
              }[deal.human_status] || { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", label: deal.human_status };

              return (
                <tr key={deal.id} className="border-b border-border/50 hover:bg-surface-elevated/50">
                  <td className="px-4 py-2.5 font-medium text-foreground max-w-xs truncate whitespace-nowrap">{deal.deal_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono whitespace-nowrap">{deal.lender_name}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Badge variant="default" className={`${config.bg} ${config.border} ${config.text}`} size="sm" dot dotClassName={config.dot}>
                      {deal.ai_decision}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono whitespace-nowrap">{formatCurrency(deal.deal_size)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground capitalize text-body-sm whitespace-nowrap">{deal.source}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Badge variant="default" className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.text}`} size="sm">
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-label-xs whitespace-nowrap">{new Date(deal.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}