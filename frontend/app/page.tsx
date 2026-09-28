"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Activity, Database, CheckCircle2, 
  RefreshCw, Briefcase, ShieldAlert, 
  Inbox, Target, Clock, 
  AlertTriangle, Check, X, Loader2, FileText, Building2, DollarSign, Plus, Settings
} from "lucide-react";

// Initialize Supabase safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function IndentureCommandCenter() {
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overrideModal, setOverrideModal] = useState<{deal: any, action: string} | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchDeals = useCallback(async (showRefresh = false) => {
    if (!supabase) {
      setError("Missing Supabase configuration in .env.local");
      setLoading(false);
      return;
    }
    
    if (showRefresh) setIsRefreshing(true);
    
    try {
      const { data, error: queryError } = await supabase
        .from("deal_queue")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      
      console.log("Fetched deals:", data?.length);
      setDeals(data || []);
      if (data && data.length > 0 && !selectedDeal) {
        setSelectedDeal(data[0]);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch deals");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleOptimisticAction = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setDeals(deals.filter(d => d.id !== id));
    setSelectedDeal(null);

    try {
      if (supabase) {
        await supabase.from("deal_queue").update({ human_status: newStatus }).eq("id", id);
      }
    } catch (err) {
      console.error("Action failed", err);
      fetchDeals(); // Revert on failure
    }
  };

  const handleApprove = async (deal: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/action/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_name: deal.deal_name, lender_name: deal.lender_name }),
      });
      if (!res.ok) throw new Error("Approve failed");
      fetchDeals();
      setSelectedDeal(null);
    } catch (err: any) {
      console.error("Approve error:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOverrideModal = (deal: any, action: string) => {
    setOverrideModal({ deal, action });
    setOverrideReason("");
  };

  const handleOverride = async () => {
    if (!overrideModal || !overrideReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/action/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: overrideModal.deal.deal_name,
          lender_name: overrideModal.deal.lender_name,
          human_decision: overrideModal.action,
          override_reason: overrideReason,
        }),
      });
      if (!res.ok) throw new Error("Override failed");
      fetchDeals();
      setSelectedDeal(null);
      setOverrideModal(null);
      setOverrideReason("");
    } catch (err: any) {
      console.error("Override error:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${backendUrl}/deals/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Simulation failed");
      await fetchDeals(true);
    } catch (err: any) {
      console.error("Simulate error:", err);
      alert(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Override Modal
  if (overrideModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-zinc-900 border border-zinc-700 rounded p-5 w-full max-w-md mx-4">
          <h3 className="text-base font-semibold text-white mb-3">Override AI Decision</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Override <span className="font-mono text-emerald-400">{overrideModal.deal.ai_decision}</span> 
            to <span className="font-mono text-blue-400">{overrideModal.action}</span> for 
            <span className="font-medium">{overrideModal.deal.deal_name}</span>
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason (required)</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Explain why you're overriding the AI decision..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setOverrideModal(null); setOverrideReason(""); }}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleOverride}
              disabled={isSubmitting || !overrideReason.trim()}
              className="px-3 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Confirm Override"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredDeals = deals.filter(d => 
    filter === "ALL" ? true : (d.human_status || "PENDING") === filter
  );

  const getStatusColor = (decision: string) => {
    switch(decision?.toUpperCase()) {
      case "REJECT": return "text-rose-500";
      case "HOLD": return "text-amber-500";
      case "NURTURE": return "text-blue-500";
      case "ADVANCE": return "text-emerald-500";
      default: return "text-zinc-500";
    }
  };

  const getStatusLabel = (decision: string) => {
    switch(decision?.toUpperCase()) {
      case "REJECT": return "REJECT";
      case "HOLD": return "HOLD";
      case "NURTURE": return "NURTURE";
      case "ADVANCE": return "ADVANCE";
      default: return decision || "UNKNOWN";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="bg-zinc-900 border border-zinc-700 p-6 max-w-lg text-center">
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">System Error</h2>
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
            <Activity className="w-4 h-4 text-zinc-400" />
            INDENTURE — HITL Triage
          </h1>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium px-2 py-0.5 bg-zinc-800 rounded">Connected</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            LLM Active
          </span>
          <span className="w-px h-4 bg-zinc-700"></span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            Synced
          </span>
          <span className="w-px h-4 bg-zinc-700"></span>
          <a href="/sandbox" className="flex items-center gap-1 hover:text-white hover:text-emerald-400 transition-colors">
            <Settings className="w-3 h-3" />
            Sandbox
          </a>
        </div>
      </header>

      {/* ACTION BAR */}
      <div className="px-4 py-2 border-b border-zinc-800 bg-[#07080B] flex items-center justify-between gap-4">
        <div className="flex gap-1">
          {["PENDING", "ALL", "APPROVED", "REJECTED"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider transition-colors ${
                filter === f 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-semibold tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className={`w-3 h-3 ${isSimulating ? "animate-spin" : ""}`} />
            + Simulate
          </button>
          <button 
            onClick={() => fetchDeals(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-medium text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* MAIN SPLIT PANE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden h-[calc(100vh-96px)]">
        
        {/* LEFT PANE - QUEUE */}
        <div className="col-span-4 border-r border-zinc-800 overflow-y-auto bg-[#07080B] p-3 space-y-1">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-900/50 border border-zinc-800 animate-pulse"></div>
            ))
          ) : filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
              <p className="text-sm font-medium">Inbox Zero</p>
            </div>
          ) : (
            filteredDeals.map(deal => {
              const statusColor = getStatusColor(deal.ai_decision);
              const statusLabel = getStatusLabel(deal.ai_decision);
              const isSelected = selectedDeal?.id === deal.id;
              
              return (
                <div 
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className={`p-3 cursor-pointer bg-zinc-900/50 border border-zinc-800 ${
                    isSelected 
                      ? "border-emerald-500 bg-zinc-900" 
                      : "hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-zinc-100 truncate pr-2 text-sm">{deal.deal_name || "Unknown Deal"}</h3>
                    <span className={`text-[9px] font-medium uppercase tracking-wider ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono mb-0.5">
                    <span>{deal.lender_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                    <span>{deal.deal_size ? `$${(deal.deal_size/1000000).toFixed(1)}M` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                    <span>{deal.source || "webhook"}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

{/* RIGHT PANE - INSPECTOR */}
        <div className="col-span-8 bg-[#0B0C10] overflow-y-auto p-4 pr-6">
          {!selectedDeal ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <p className="text-sm">Select a deal from the queue to inspect</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Deal Header */}
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{selectedDeal.deal_name}</h2>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-500 font-mono">
                    <span>{selectedDeal.lender_name}</span>
                    <span>{selectedDeal.deal_size ? `$${(selectedDeal.deal_size/1000000).toFixed(1)}M` : "—"}</span>
                    <span>{selectedDeal.source || "webhook"}</span>
                    <span>{selectedDeal.geography || "—"}</span>
                    <span>{selectedDeal.industry || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded font-bold text-sm uppercase tracking-wider ${getStatusColor(selectedDeal.ai_decision).replace("text-", "bg-").replace("500", "950/40")} border ${getStatusColor(selectedDeal.ai_decision).replace("text-", "border-").replace("500", "800/60")} ${getStatusColor(selectedDeal.ai_decision).replace("text-", "text-")}`}>
                    {getStatusLabel(selectedDeal.ai_decision)}
                  </span>
                </div>
              </div>

              {/* Mandate Checks */}
              {selectedDeal.mandate_checks && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Mandate Checks
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(selectedDeal.mandate_checks).map(([key, passed]) => (
                      <div key={key} className="p-2.5 bg-zinc-900/50 border border-zinc-800 flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${passed ? "text-emerald-500" : "text-rose-500"}`} />
                        <span className="text-sm font-medium text-zinc-200 capitalize">
                          {key.replace("_check", "").replace("_", " ")}
                        </span>
                        <span className={`text-xs font-mono ${passed ? "text-emerald-400" : "text-rose-400"}`}>
                          {passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Evidence */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Evidence</h3>
                <div className="bg-zinc-900/50 p-3 border border-zinc-800 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                  {selectedDeal.evidence || "No evidence recorded."}
                </div>
              </div>

              {/* Missing Info */}
              {selectedDeal.missing_info && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Missing Information
                  </h3>
                  <div className="p-3 border border-amber-800/50 bg-amber-950/20 text-sm text-amber-300 whitespace-pre-wrap">
                    {selectedDeal.missing_info}
                  </div>
                </div>
              )}

              {/* Next Best Action */}
              {selectedDeal.next_best_action && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-500" />
                    Next Best Action
                  </h3>
                  <div className="p-3 border border-blue-800/50 bg-blue-950/20 text-sm text-blue-300 whitespace-pre-wrap">
                    {selectedDeal.next_best_action}
                  </div>
                </div>
              )}

              {/* Email Draft */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Draft</h3>
                <div className="bg-zinc-900/50 p-3 border border-zinc-800 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                  {selectedDeal.email_draft || "No draft generated."}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedDeal.human_status === "PENDING" && (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-zinc-800">
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "REJECT")}
                    className="px-4 py-2 rounded bg-transparent border border-rose-500 text-rose-400 font-medium hover:bg-rose-950/20 flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "HOLD")}
                    className="px-4 py-2 rounded bg-transparent border border-amber-500 text-amber-400 font-medium hover:bg-amber-950/20 flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Hold
                  </button>
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "NURTURE")}
                    className="px-4 py-2 rounded bg-transparent border border-blue-500 text-blue-400 font-medium hover:bg-blue-950/20 flex items-center justify-center gap-1.5"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Nurture
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedDeal)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isSubmitting ? "Processing..." : "Approve & Advance"}
                  </button>
                </div>
              )}

              {/* Human Status Display */}
              {selectedDeal.human_status !== "PENDING" && (
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/50">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      selectedDeal.human_status === "APPROVED" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60" :
                      selectedDeal.human_status === "OVERRIDDEN" ? "bg-blue-950/40 text-blue-400 border border-blue-800/60" :
                      "bg-rose-950/40 text-rose-400 border border-rose-800/60"
                    }`}>
                      {selectedDeal.human_status}
                    </span>
                    {selectedDeal.human_decision && (
                      <span className="text-zinc-300 font-mono text-sm">
                        Decision: {selectedDeal.human_decision}
                      </span>
                    )}
                    {selectedDeal.override_reason && (
                      <span className="text-zinc-500 text-sm italic ml-auto">
                        "{selectedDeal.override_reason}"
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}