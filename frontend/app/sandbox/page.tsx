"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Settings, RotateCcw, Play, CheckCircle2, XCircle, 
  Plus, Minus, Globe, Building2, DollarSign, 
  ChevronDown, ChevronUp, FileText, Filter,
  ArrowRight, ArrowLeft
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface Lender {
  name: string;
  min_ebitda: number;
  max_leverage: number;
  allowed_geography: string[];
  qualitative_exclusion: string;
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

interface MandateForm {
  min_ebitda: number | "";
  max_leverage: number | "";
  allowed_geography: string;
  min_deal_size: number | "";
  allowed_industry: string;
}

export default function MandateSandboxPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>("");
  const [form, setForm] = useState<MandateForm>({
    min_ebitda: "",
    max_leverage: "",
    allowed_geography: "",
    min_deal_size: "",
    allowed_industry: "",
  });
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const fetchLenders = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/mandate-sandbox/lenders`);
      if (!res.ok) throw new Error("Failed to fetch lenders");
      const data = await res.json();
      setLenders(data.lenders);
      if (data.lenders.length > 0 && !selectedLender) {
        setSelectedLender(data.lenders[0].name);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedLender]);

  const fetchCurrentMandate = useCallback(async () => {
    if (!selectedLender) return;
    const lender = lenders.find(l => l.name === selectedLender);
    if (lender) {
      setForm({
        min_ebitda: lender.min_ebitda,
        max_leverage: lender.max_leverage,
        allowed_geography: lender.allowed_geography.join(", "),
        min_deal_size: "",
        allowed_industry: "",
      });
    }
  }, [selectedLender, lenders]);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  useEffect(() => {
    fetchCurrentMandate();
  }, [fetchCurrentMandate]);

  const handleSimulate = async () => {
    if (!selectedLender) return;
    setLoading(true);
    setError(null);
    try {
      const payload: any = { lender_name: selectedLender };
      if (form.min_ebitda !== "") payload.min_ebitda = Number(form.min_ebitda);
      if (form.max_leverage !== "") payload.max_leverage = Number(form.max_leverage);
      if (form.allowed_geography.trim()) payload.allowed_geography = form.allowed_geography.split(",").map(s => s.trim());
      if (form.min_deal_size !== "") payload.min_deal_size = Number(form.min_deal_size);
      if (form.allowed_industry.trim()) payload.allowed_industry = form.allowed_industry.split(",").map(s => s.trim());

      const res = await fetch(`${backendUrl}/mandate-sandbox/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    fetchCurrentMandate();
    setResult(null);
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  };

  const getDecisionConfig = (decision: string) => {
    switch (decision) {
      case "ADVANCE": return { bg: "bg-emerald-950/40", border: "border-emerald-800/60", text: "text-emerald-400" };
      case "HOLD": return { bg: "bg-amber-950/40", border: "border-amber-800/60", text: "text-amber-400" };
      case "NURTURE": return { bg: "bg-blue-950/40", border: "border-blue-800/60", text: "text-blue-400" };
      case "REJECT": return { bg: "bg-rose-950/40", border: "border-rose-800/60", text: "text-rose-400" };
      default: return { bg: "bg-zinc-900/40", border: "border-zinc-700/60", text: "text-zinc-400" };
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-zinc-900 border border-zinc-700 p-6 max-w-lg text-center">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Error</h2>
          <p className="text-zinc-400 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#0B0C10] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            INDENTURE — Mandate Sandbox
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            LLM Active
          </span>
          <span className="w-px h-4 bg-zinc-700"></span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Synced
          </span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* LENDER SELECTOR */}
        <div className="bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Lender</label>
            <select
              value={selectedLender}
              onChange={(e) => setSelectedLender(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
            >
              {lenders.map(l => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* MANDATE CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* CURRENT MANDATE */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Current Mandate
            </h3>
            {lenders.find(l => l.name === selectedLender) && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Min EBITDA</span>
                  <span className="font-mono text-zinc-200">{lenders.find(l => l.name === selectedLender)?.min_ebitda?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Max Leverage</span>
                  <span className="font-mono text-zinc-200">{lenders.find(l => l.name === selectedLender)?.max_leverage}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Geography</span>
                  <span className="font-mono text-zinc-200">{lenders.find(l => l.name === selectedLender)?.allowed_geography.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Qualitative</span>
                  <span className="font-mono text-zinc-200 truncate max-w-[200px]">{lenders.find(l => l.name === selectedLender)?.qualitative_exclusion}</span>
                </div>
              </div>
            )}
          </div>

          {/* SIMULATED MANDATE CONTROLS */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              Simulated Mandate
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Min EBITDA</label>
                <input
                  type="number"
                  value={form.min_ebitda}
                  onChange={(e) => setForm({...form, min_ebitda: e.target.value === "" ? "" : Number(e.target.value)})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Max Leverage</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.max_leverage}
                  onChange={(e) => setForm({...form, max_leverage: e.target.value === "" ? "" : Number(e.target.value)})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Geography (comma-separated)</label>
                <input
                  type="text"
                  value={form.allowed_geography}
                  onChange={(e) => setForm({...form, allowed_geography: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="USA, Canada, UK"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Min Deal Size (optional)</label>
                <input
                  type="number"
                  value={form.min_deal_size}
                  onChange={(e) => setForm({...form, min_deal_size: e.target.value === "" ? "" : Number(e.target.value)})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Allowed Industries (comma-separated, optional)</label>
                <input
                  type="text"
                  value={form.allowed_industry}
                  onChange={(e) => setForm({...form, allowed_industry: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Healthcare Technology, B2B SaaS"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleSimulate}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  Run Simulation
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-500 hover:text-white hover:bg-zinc-800"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        {result && (
          <div className="space-y-4">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryCard label="Eligible Before" value={result.eligible_before} color="amber" />
              <SummaryCard label="Eligible After" value={result.eligible_after} color="emerald" />
              <SummaryCard label="Newly Eligible" value={result.newly_eligible} color="emerald" icon={<Plus className="w-3.5 h-3.5" />} />
              <SummaryCard label="No Longer Eligible" value={result.no_longer_eligible} color="rose" icon={<XCircle className="w-3.5 h-3.5" />} />
              <SummaryCard label="Unchanged" value={result.unchanged} color="blue" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            </div>

            {/* DECISION DISTRIBUTION */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Simulated Decision Distribution</h3>
              <div className="grid grid-cols-4 gap-2">
                {["ADVANCE", "HOLD", "NURTURE", "REJECT"].map(key => {
                  const config = getDecisionConfig(key);
                  const count = result.decision_distribution[key] || 0;
                  return (
                    <div key={key} className={`p-2 rounded ${config.bg} ${config.border}`}>
                      <div className="text-xs font-semibold uppercase tracking-wider">{key}</div>
                      <div className={`text-2xl font-bold font-mono ${config.text}`}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAIL TABLES */}
            <div className="space-y-4">
              {result.deal_details.newly_eligible.length > 0 && (
                <DealDetailSection
                  title="Newly Eligible"
                  count={result.newly_eligible}
                  deals={result.deal_details.newly_eligible}
                  icon={<Plus className="w-3.5 h-3.5 text-emerald-400" />}
                  color="emerald"
                  showDetails={showDetails}
                  toggleDetails={setShowDetails}
                  formatCurrency={formatCurrency}
                  getDecisionConfig={getDecisionConfig}
                />
              )}
              {result.deal_details.no_longer_eligible.length > 0 && (
                <DealDetailSection
                  title="No Longer Eligible"
                  count={result.no_longer_eligible}
                  deals={result.deal_details.no_longer_eligible}
                  icon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  color="rose"
                  showDetails={showDetails}
                  toggleDetails={setShowDetails}
                  formatCurrency={formatCurrency}
                  getDecisionConfig={getDecisionConfig}
                />
              )}
              {result.deal_details.unchanged_eligible.length > 0 && (
                <DealDetailSection
                  title="Unchanged Eligible"
                  count={result.deal_details.unchanged_eligible.length}
                  deals={result.deal_details.unchanged_eligible}
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  color="blue"
                  showDetails={showDetails}
                  toggleDetails={setShowDetails}
                  formatCurrency={formatCurrency}
                  getDecisionConfig={getDecisionConfig}
                />
              )}
              {result.deal_details.unchanged_ineligible.length > 0 && (
                <DealDetailSection
                  title="Unchanged Ineligible"
                  count={result.deal_details.unchanged_ineligible.length}
                  deals={result.deal_details.unchanged_ineligible}
                  icon={<FileText className="w-3.5 h-3.5 text-zinc-500" />}
                  color="zinc"
                  showDetails={showDetails}
                  toggleDetails={setShowDetails}
                  formatCurrency={formatCurrency}
                  getDecisionConfig={getDecisionConfig}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { 
  label: string; 
  value: number; 
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`bg-zinc-900/50 border border-zinc-800 p-3 ${color === "emerald" ? "border-emerald-800/50" : color === "rose" ? "border-rose-800/50" : color === "blue" ? "border-blue-800/50" : "border-amber-800/50"}`}>
      <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-2xl font-bold font-mono text-${color}-400`}>{value}</p>
        {icon && <span className="text-{color}-400">{icon}</span>}
      </div>
    </div>
  );
}

function DealDetailSection({ 
  title, count, deals, icon, color, showDetails, toggleDetails, formatCurrency, getDecisionConfig 
}: {
  title: string;
  count: number;
  deals: any[];
  icon: React.ReactNode;
  color: string;
  showDetails: Record<string, boolean>;
  toggleDetails: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  formatCurrency: (val: number | null) => string;
  getDecisionConfig: (decision: string) => { bg: string; border: string; text: string };
}) {
  const isExpanded = showDetails[title];
  
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 overflow-hidden">
      <button
        onClick={() => toggleDetails(prev => ({...prev, [title]: !prev[title]}))}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-${color}-400`}>{icon}</span>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-mono text-${color}-400 bg-${color}-950/30`}>{count}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 ${isExpanded ? "rotate-180" : ""} transition-transform`} />
      </button>
      {isExpanded && (
        <div className="border-t border-zinc-800 p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Deal</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Size</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Industry</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Geo</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">EBITDA</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Leverage</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">AI Decision</th>
                <th className="px-3 py-2 font-medium text-zinc-400 uppercase tracking-wider">Checks</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={`${deal.deal_name}-${i}`} className="border-b border-zinc-800/50 hover:bg-zinc-900">
                  <td className="px-3 py-2 font-medium text-zinc-100 max-w-xs truncate">{deal.deal_name}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{formatCurrency(deal.deal_size)}</td>
                  <td className="px-3 py-2 text-zinc-400">{deal.industry || "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{deal.geography || "—"}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{deal.ebitda ? deal.ebitda.toLocaleString() : "—"}</td>
                  <td className="px-3 py-2 text-zinc-300 font-mono">{deal.leverage ? deal.leverage + "x" : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getDecisionConfig(deal.ai_decision).bg} ${getDecisionConfig(deal.ai_decision).border} ${getDecisionConfig(deal.ai_decision).text}`}>
                      {deal.ai_decision}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {deal.simulated_checks?.ebitda_check ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {deal.simulated_checks?.leverage_check ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      {deal.simulated_checks?.geography_check ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}