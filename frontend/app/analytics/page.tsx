"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  BarChart3, TrendingUp, DollarSign, FileText, 
  ArrowUpRight, ArrowDownRight, Minus, X, CheckCircle, 
  AlertCircle, Clock, Target, Building2
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
        <div className="animate-pulse flex gap-4">
          <div className="w-8 h-8 bg-zinc-800 rounded"></div>
          <div className="w-8 h-8 bg-zinc-800 rounded"></div>
          <div className="w-8 h-8 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-xl max-w-lg text-center backdrop-blur-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-rose-100 mb-2">Failed to load analytics</h2>
          <p className="text-rose-300/80 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#0B0C10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              INDENTURE: Analytics
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5 font-semibold">Deal Flow Intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          {["overview", "deals"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "overview" | "deals")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent"
              }`}
            >
              {tab === "overview" ? "Overview" : "Deal Log"}
            </button>
          ))}
        </div>
      </header>

      {activeTab === "overview" && analytics && (
        <div className="flex-1 p-6 space-y-6">
          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={FileText}
              label="Total Deals"
              value={analytics.total_deals}
              iconColor="text-blue-400"
            />
            <MetricCard
              icon={CheckCircle}
              label="ADVANCE %"
              value={`${analytics.advance_pct}%`}
              iconColor="text-emerald-400"
              trend={analytics.advance_pct > 50 ? "positive" : "neutral"}
            />
            <MetricCard
              icon={Clock}
              label="HOLD %"
              value={`${analytics.hold_pct}%`}
              iconColor="text-amber-400"
            />
            <MetricCard
              icon={Target}
              label="NURTURE %"
              value={`${analytics.nurture_pct}%`}
              iconColor="text-blue-400"
            />
            <MetricCard
              icon={X}
              label="REJECT %"
              value={`${analytics.reject_pct}%`}
              iconColor="text-rose-400"
            />
            <MetricCard
              icon={DollarSign}
              label="Avg Deal Size"
              value={formatCurrency(analytics.avg_deal_size)}
              iconColor="text-green-400"
            />
          </div>

          {/* DECISION BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0B0C10] border border-white/[0.04] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Decision Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { key: "ADVANCE", label: "ADVANCE", pct: analytics.advance_pct, color: "emerald" },
                  { key: "HOLD", label: "HOLD", pct: analytics.hold_pct, color: "amber" },
                  { key: "NURTURE", label: "NURTURE", pct: analytics.nurture_pct, color: "blue" },
                  { key: "REJECT", label: "REJECT", pct: analytics.reject_pct, color: "rose" },
                ].map(({ key, label, pct, color }) => (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className={`font-medium text-${color}-400`}>{label}</span>
                      <span className="font-mono text-zinc-300">{pct}%</span>
                    </div>
                    <div className="h-2 bg-zinc-900/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 bg-${color}-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0B0C10] border border-white/[0.04] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Deals by Source
              </h3>
              <div className="space-y-4">
                {Object.entries(analytics.deals_by_source).length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No source data available</p>
                ) : (
                  Object.entries(analytics.deals_by_source).map(([source, count]) => {
                    const advanced = analytics.advanced_by_source[source] || 0;
                    const rate = count > 0 ? Math.round(advanced / count * 100) : 0;
                    return (
                      <div key={source} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-zinc-200 capitalize">{source}</span>
                          <span className="font-mono text-zinc-400">{count} deals</span>
                        </div>
                        <div className="h-2 bg-zinc-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-emerald-500/30 transition-all duration-500"
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
          <div className="bg-[#0B0C10] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Source Performance
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] bg-zinc-900/30 text-left">
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Total Deals</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Advanced</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Rejected</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Advance Rate</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Reject Rate</th>
                  <th className="px-6 py-3 font-medium text-zinc-400 uppercase tracking-wider text-right">Avg Deal Size</th>
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
                    <tr key={source} className="border-b border-white/[0.02] hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-3 font-mono text-zinc-200 capitalize">{source}</td>
                      <td className="px-6 py-3 text-right font-mono text-zinc-300">{total}</td>
                      <td className="px-6 py-3 text-right font-mono text-emerald-400">{advanced}</td>
                      <td className="px-6 py-3 text-right font-mono text-rose-400">{rejected}</td>
                      <td className="px-6 py-3 text-right font-mono text-emerald-400">{advanceRate}%</td>
                      <td className="px-6 py-3 text-right font-mono text-rose-400">{rejectRate}%</td>
                      <td className="px-6 py-3 text-right font-mono text-zinc-300">{formatCurrency(avgSize)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "deals" && (
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-[#0B0C10] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                All Deals
              </h3>
              <span className="text-sm text-zinc-500 font-mono">{deals.length} records</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] bg-zinc-900/30 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Deal</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Lender</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Decision</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">No deals recorded yet</td>
                  </tr>
                ) : (
                  deals.map(deal => {
                    const config = getDecisionConfig(deal.ai_decision);
                    const Icon = config.icon;
                    return (
                      <tr key={deal.id} className="border-b border-white/[0.02] hover:bg-zinc-900/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-100 max-w-xs truncate">{deal.deal_name}</td>
                        <td className="px-4 py-3 text-zinc-400 font-mono">{deal.lender_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}>
                            <Icon className="w-3 h-3" />
                            {deal.ai_decision}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300 font-mono">{formatCurrency(deal.deal_size)}</td>
                        <td className="px-4 py-3 text-zinc-500 capitalize">{deal.source}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            deal.human_status === "APPROVED" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60" :
                            deal.human_status === "OVERRIDDEN" ? "bg-blue-950/40 text-blue-400 border border-blue-800/60" :
                            deal.human_status === "REJECTED" ? "bg-rose-950/40 text-rose-400 border border-rose-800/60" :
                            "bg-zinc-900/40 text-zinc-400 border border-zinc-700/60"
                          }`}>
                            {deal.human_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
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

function MetricCard({ icon: Icon, label, value, iconColor, trend }: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  iconColor: string;
  trend?: "positive" | "neutral";
}) {
  return (
    <div className="bg-[#0B0C10] border border-white/[0.04] rounded-xl p-5 hover:border-zinc-700/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold font-mono text-white">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-zinc-900/50 flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend === "positive" && (
        <div className="mt-3 flex items-center gap-1 text-emerald-400 text-xs font-medium">
          <ArrowUpRight className="w-3 h-3" />
          Above threshold
        </div>
      )}
    </div>
  );
}