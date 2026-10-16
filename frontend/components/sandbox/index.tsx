"use client";

import React from "react";
import { Panel, PanelHeader, Input, Button, Select, Badge } from "@/components/ui";
import { formatCurrency, getDecisionConfig } from "@/lib/utils";
import { Plus, XCircle, CheckCircle2, FileText, ChevronDown } from "lucide-react";

interface Lender {
  name: string;
  min_ebitda: number;
  max_leverage: number;
  allowed_geography: string[];
  qualitative_exclusion: string;
}

interface MandateForm {
  min_ebitda: number | "";
  max_leverage: number | "";
  allowed_geography: string;
  min_deal_size: number | "";
  allowed_industry: string;
}

interface SandboxResult {
  lender_name: string;
  current_mandate: Lender;
  simulated_mandate: Lender;
  eligible_before: number;
  eligible_after: number;
  newly_eligible: number;
  no_longer_eligible: number;
  unchanged: number;
  decision_distribution: Record<string, number>;
  deal_details: {
    newly_eligible: any[];
    no_longer_eligible: any[];
    unchanged_eligible: any[];
    unchanged_ineligible: any[];
  };
}

export function LenderSelector({ lenders, selectedLender, onChange }: { lenders: Lender[]; selectedLender: string; onChange: (value: string) => void }) {
  return (
    <Panel variant="default" padding="md">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-label-xs text-muted-foreground uppercase tracking-wider font-medium">Lender</label>
          <Select
            value={selectedLender}
            onChange={onChange}
            options={lenders.map(l => ({ value: l.name, label: l.name }))}
            className="w-auto min-w-[200px]"
          />
        </div>
      </div>
    </Panel>
  );
}

export function MandateControls({ currentLender, form, onChange, onSimulate, onReset, loading }: { 
  currentLender: Lender | undefined; 
  form: MandateForm; 
  onChange: (field: keyof MandateForm, value: string | number) => void;
  onSimulate: () => void;
  onReset: () => void;
  loading: boolean;
}) {
  return (
    <Panel variant="default" padding="md">
      <PanelHeader title="Simulated Mandate" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      <div className="space-y-3">
        <Input
          label="Min EBITDA"
          type="number"
          value={form.min_ebitda}
          onChange={(e) => onChange("min_ebitda", e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Leave empty to keep current"
        />
        <Input
          label="Max Leverage"
          type="number"
          step="0.1"
          value={form.max_leverage}
          onChange={(e) => onChange("max_leverage", e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Leave empty to keep current"
        />
        <Input
          label="Geography (comma-separated)"
          type="text"
          value={form.allowed_geography}
          onChange={(e) => onChange("allowed_geography", e.target.value)}
          placeholder="USA, Canada, UK"
        />
        <Input
          label="Min Deal Size (optional)"
          type="number"
          value={form.min_deal_size}
          onChange={(e) => onChange("min_deal_size", e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Leave empty to keep current"
        />
        <Input
          label="Allowed Industries (comma-separated, optional)"
          type="text"
          value={form.allowed_industry}
          onChange={(e) => onChange("allowed_industry", e.target.value)}
          placeholder="Healthcare Technology, B2B SaaS"
        />
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button onClick={onSimulate} disabled={loading} className="flex-1 gap-2" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 15.632l-2.54-2.54a6 6 0 10-8.485 8.486l2.959 2.96a1 1 0 001.415 0l2.392-2.391a1 1 0 000-1.415l-2.254-2.253a4 4 0 115.657-5.657l2.539 2.54" /></svg>}>
            Run Simulation
          </Button>
          <Button variant="ghost" onClick={onReset} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
            Reset
          </Button>
        </div>
      </div>
    </Panel>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: "success" | "warning" | "info" | "danger" | "default";
  icon?: React.ReactNode;
}

export function SummaryCard({ label, value, color, icon }: SummaryCardProps) {
  const colorMap = {
    success: { border: "border-success/50", text: "text-success" },
    warning: { border: "border-warning/50", text: "text-warning" },
    info: { border: "border-info/50", text: "text-info" },
    danger: { border: "border-danger/50", text: "text-danger" },
    default: { border: "border-border", text: "text-foreground" },
  };
  const c = colorMap[color];

  return (
    <Panel variant="default" padding="md" className={c.border}>
      <p className="text-label-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-heading-md font-bold font-mono ${c.text}`}>{value}</p>
        {icon && <span className={c.text}>{icon}</span>}
      </div>
    </Panel>
  );
}

export function DecisionDistribution({ result }: { result: SandboxResult }) {
  return (
    <Panel variant="default" padding="md">
      <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3">Simulated Decision Distribution</h3>
      <div className="grid grid-cols-4 gap-2">
        {["ADVANCE", "HOLD", "NURTURE", "REJECT"].map((key) => {
          const config = getDecisionConfig(key);
          const count = result.decision_distribution[key] || 0;
          return (
            <div key={key} className={`p-2 rounded ${config.bg} ${config.border}`}>
              <div className="text-label-xs font-semibold uppercase tracking-wider">{key}</div>
              <div className={`text-heading-sm font-bold font-mono ${config.text}`}>{count}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

interface DealDetailSectionProps {
  title: string;
  count: number;
  deals: any[];
  icon: React.ReactNode;
  color: "success" | "danger" | "info" | "default";
  showDetails: Record<string, boolean>;
  toggleDetails: (title: string) => void;
}

export function DealDetailSection({ title, count, deals, icon, color, showDetails, toggleDetails }: DealDetailSectionProps) {
  const isExpanded = showDetails[title];
  
  const colorMap = {
    success: { icon: "text-success", badge: "text-success bg-success/10 border-success/20" },
    danger: { icon: "text-danger", badge: "text-danger bg-danger/10 border-danger/20" },
    info: { icon: "text-info", badge: "text-info bg-info/10 border-info/20" },
    default: { icon: "text-muted-foreground", badge: "text-muted-foreground bg-muted/10 border-border" },
  };
  const c = colorMap[color];

  return (
    <Panel variant="default" padding="none" className="overflow-hidden">
      <button
        onClick={() => toggleDetails(title)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-elevated transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className={c.icon}>{icon}</span>
          <span className="text-label-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <Badge variant="default" className={c.badge} size="sm">{count}</Badge>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && (
        <div className="border-t border-border p-4 overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Deal</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Size</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Industry</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Geo</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">EBITDA</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Leverage</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">AI Decision</th>
                <th className="px-3 py-2 font-medium text-label-xs text-muted-foreground uppercase tracking-wider">Checks</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={`${deal.deal_name}-${i}`} className="border-b border-border/50 hover:bg-surface-elevated/50">
                  <td className="px-3 py-2 font-medium text-foreground max-w-xs truncate">{deal.deal_name}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono">{formatCurrency(deal.deal_size)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{deal.industry || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{deal.geography || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono">{deal.ebitda ? deal.ebitda.toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono">{deal.leverage ? deal.leverage + "x" : "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="default" className={`${getDecisionConfig(deal.ai_decision).bg} ${getDecisionConfig(deal.ai_decision).border} ${getDecisionConfig(deal.ai_decision).text}`} size="sm">
                      {deal.ai_decision}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {deal.simulated_checks?.ebitda_check ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                      {deal.simulated_checks?.leverage_check ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                      {deal.simulated_checks?.geography_check ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}