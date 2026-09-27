"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  BarChart3, TrendingUp, DollarSign, FileText, 
  ArrowUpRight, Minus, X, CheckCircle, 
  Clock, Target, Building2
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

interface Deal {
  id: number;
  deal_name: string;
  lender_name: string;
  deal_size: number | null;
  industry: string | null;
  geography: string | null;
  ebitda: number | null;
  leverage: number | null;
  source: string | null;
  ai_decision: string;
  evidence: string;
  email_draft: string;
  missing_info: string;
  next_best_action: string;
  mandate_checks: Record<string, boolean>;
  human_status: string;
  human_decision: string | null;
  override_reason: string | null;
  created_at: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deals">("overview");

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchDeals = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: queryError } = await supabase
        .from("deal_queue")
        .select("*")
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setDeals(data || []);
    } catch (err: any) {
      console.error("Fetch deals error:", err);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchDeals();
    setLoading(false);
  }, [fetchAnalytics, fetchDeals]);

  const getDecisionConfig = (decision: string) => {
    switch (decision) {
      case "ADVANCE": return { bg: "bg-emerald-950/40", border: "border-emerald-800/60", text: "text-emerald-400", icon: CheckCircle };
      case "HOLD": return { bg: "bg-amber-950/40", border: "border-amber-800/60", text: "text-amber-400", icon: Clock };
      case "NURTURE": return { bg: "bg-blue-950/40", border: "border-blue-800/60", text: "text-blue-400", icon: Target };
      case "REJECT": return { bg: "bg-rose-950/40", border: "border-rose-800/60", text: "text-rose-400", icon: X };
      default: return { bg: "bg-zinc-900/40", border: "border-zinc-700/60", text: "text-zinc-400", icon: Minus };
    }
  };

  const formatCurrency = (val: number | null) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center text-zinc-100 font-sans">
        <div className="animate-pulse flex gap-3">
          <div className="w-6 h-6 bg-zinc-800 rounded"></div>
          <div className="w-6 h-6 bg-zinc-800 rounded"></div>
          <div className="w-6 h-6 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-zinc-900 border border-zinc-700 p-6 max-w-lg text-center">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Failed to load analytics</h2>
          <p className="text-zinc-400 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#0B0C10] sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            INDENTURE — Analytics
          </h1>
        </div>
        <div className="flex gap-1">
          {["overview", "deals"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "overview" | "deals")}
              className={`px-3 py-1.5 rounded text-[10px] font-semibold tracking-wider transition-colors ${
                activeTab === tab
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {tab === "overview" ? "Overview" : "Deal Log"}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "overview" && analytics && (
        <div className="flex-1 p-4 space-y-4">
          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Total Deals" value={analytics.total_deals} />
            <MetricCard label="ADVANCE %" value={`${analytics.advance_pct}%`} color="emerald" />
            <MetricCard label="HOLD %" value={`${analytics.hold_pct}%`} color="amber" />
            <MetricCard label="NURTURE %" value={`${analytics.nurture_pct}%`} color="blue" />
            <MetricCard label="REJECT %" value={`${analytics.reject_pct}%`} color="rose" />
            <MetricCard label="Avg Deal Size" value={formatCurrency(analytics.avg_deal_size)} color="green" />
          </div>

          {/* DECISION BREAKDOWN + DEALS BY SOURCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Decision Distribution</h3>
              <div className="space-y-3">
                {[
                  { key: "ADVANCE", label: "ADVANCE", pct: analytics.advance_pct, color: "emerald" },
                  { key: "HOLD", label: "HOLD", pct: analytics.hold_pct, color: "amber" },
                  { key: "NURTURE", label: "NURTURE", pct: analytics.nurture_pct, color: "blue" },
                  { key: "REJECT", label: "REJECT", pct: analytics.reject_pct, color: "rose" },
                ].map(({ key, label, pct, color }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium text-${color}-400`}>{label}</span>
                      <span className="font-mono text-zinc-300">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 overflow-hidden">
                      <div 
                        className={`h-full bg-${color}-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-4">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Deals by Source</h3>
              <div className="space-y-3">
                {Object.entries(analytics.deals_by_source).length === 0 ? (
                  <p className="text-zinc-500 text-center py-6 text-sm">No source data available</p>
                ) : (
                  Object.entries(analytics.deals_by_source).map(([source, count]) => {
                    const advanced = analytics.advanced_by_source[source] || 0;
                    const rate = count > 0 ? Math.round(advanced / count * 100) : 0;
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-zinc-200 capitalize">{source}</span>
                          <span className="font-mono text-zinc-400">{count} deals</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500/50"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Advanced: {advanced}</span>
                          <span className="text-emerald-400">{rate}% advance rate</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* SOURCE PERFORMANCE TABLE */}
          <div className="bg-zinc-900/50 border border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Source Performance
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left">
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Advanced</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Rejected</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Adv Rate</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Rej Rate</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider text-right">Avg Size</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(analytics.deals_by_source).map(source => {
                  const total = analytics.deals_by_source[source];
                  const advanced = analytics.advanced_by_source[source] || 0;
                  const rejected = analytics.rejected_by_source[source] || 0;
                  const advanceRate = total > 0 ? Math.round(advanced / total * 100) : 0;
                  const rejectRate = total > 0 ? Math.round(rejected / total * 100) : 0;
                  const sourceDeals = deals.filter(d => d.source === source && d.deal_size);
                  const avgSize = sourceDeals.length > 0 
                    ? sourceDeals.reduce((sum, d) => sum + (d.deal_size || 0), 0) / sourceDeals.length 
                    : 0;
                  return (
                    <tr key={source} className="border-b border-zinc-800/50 hover:bg-zinc-900">
                      <td className="px-4 py-2.5 font-mono text-zinc-200 capitalize">{source}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-zinc-300">{total}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{advanced}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-400">{rejected}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{advanceRate}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-rose-400">{rejectRate}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-zinc-300">{formatCurrency(avgSize)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "deals" && (
        <div className="flex-1 p-4 overflow-auto">
          <div className="bg-zinc-900/50 border border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">All Deals</h3>
              <span className="text-xs text-zinc-500 font-mono">{deals.length} records</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left">
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Deal</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Lender</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Decision</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 text-sm">No deals recorded yet</td>
                  </tr>
                ) : (
                  deals.map(deal => {
                    const config = getDecisionConfig(deal.ai_decision);
                    const Icon = config.icon;
                    return (
                      <tr key={deal.id} className="border-b border-zinc-800/50 hover:bg-zinc-900">
                        <td className="px-4 py-2.5 font-medium text-zinc-100 max-w-xs truncate">{deal.deal_name}</td>
                        <td className="px-4 py-2.5 text-zinc-400 font-mono">{deal.lender_name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}>
                            <Icon className="w-2.5 h-2.5" />
                            {deal.ai_decision}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-300 font-mono">{formatCurrency(deal.deal_size)}</td>
                        <td className="px-4 py-2.5 text-zinc-500 capitalize text-sm">{deal.source}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            deal.human_status === "APPROVED" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60" :
                            deal.human_status === "OVERRIDDEN" ? "bg-blue-950/40 text-blue-400 border border-blue-800/60" :
                            deal.human_status === "REJECTED" ? "bg-rose-950/40 text-rose-400 border border-rose-800/60" :
                            "bg-zinc-900/40 text-zinc-400 border border-zinc-700/60"
                          }`}>
                            {deal.human_status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 font-mono text-xs">
                          {new Date(deal.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { 
  label: string; 
  value: string | number; 
  color?: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-3">
      <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-white">{value}</p>
    </div>
  );
}