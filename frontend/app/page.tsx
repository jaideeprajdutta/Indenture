"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Activity, Database, AlertCircle, CheckCircle2, 
  XCircle, RefreshCw, Briefcase, Mail, ShieldAlert, 
  ChevronRight, Inbox, Send, Archive, Target, Clock, 
  AlertTriangle, Check, X, Loader2, FileText, Building2, DollarSign, Plus
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
        .select("*");

      if (queryError) throw queryError;
      
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
  }, [selectedDeal]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0B0C10] border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95">
          <h3 className="text-lg font-semibold text-white mb-4">Override AI Decision</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Override <span className="font-mono text-emerald-400">{overrideModal.deal.ai_decision}</span> 
            to <span className="font-mono text-blue-400">{overrideModal.action}</span> for 
            <span className="font-medium">{overrideModal.deal.deal_name}</span>
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-2">Reason (required)</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Explain why you're overriding the AI decision..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setOverrideModal(null); setOverrideReason(""); }}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleOverride}
              disabled={isSubmitting || !overrideReason.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-xl max-w-lg text-center backdrop-blur-xl">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-rose-100 mb-2">System Error</h2>
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
              <Activity className="w-5 h-5 text-emerald-500" />
              INDENTURE: HITL Triage Desk
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5 font-semibold">Connected</p>
          </div>
          <div className="h-8 w-px bg-white/[0.08]"></div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-900/50 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Groq LLM Active
            </div>
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-950/30 border border-blue-900/50 text-blue-400">
              <Database className="w-3 h-3" />
              Supabase Synced
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Queue</span>
            <span className="text-lg font-mono font-semibold">{filteredDeals.length}</span>
          </div>
        </div>
      </header>

      {/* ACTION BAR */}
      <div className="px-6 py-3 border-b border-white/[0.02] flex justify-between items-center bg-[#07080B]">
        <div className="flex gap-2">
          {["PENDING", "ALL", "APPROVED", "REJECTED"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                filter === f 
                  ? "bg-zinc-800 text-white border border-zinc-700" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent"
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            + Simulate Inbound Deal
          </button>
          <button 
            onClick={() => fetchDeals(true)}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            SYNC FEED
          </button>
        </div>
      </div>

      {/* MAIN SPLIT PANE */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden h-[calc(100vh-120px)]">
        
        {/* LEFT PANE - QUEUE */}
        <div className="col-span-4 border-r border-white/[0.04] overflow-y-auto bg-[#07080B] p-4 space-y-3">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-zinc-900/30 border border-white/[0.02] animate-pulse"></div>
            ))
          ) : filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <Inbox className="w-8 h-8 mb-2 opacity-50" />
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
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 bg-[#0B0C10] border border-zinc-800 ${
                    isSelected 
                      ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" 
                      : "hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-zinc-100 truncate pr-2">{deal.deal_name || "Unknown Deal"}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {deal.lender_name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                    <DollarSign className="w-3.5 h-3.5" />
                    {deal.deal_size ? `$${(deal.deal_size/1000000).toFixed(1)}M` : "—"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                    <FileText className="w-3.5 h-3.5" />
                    {deal.source || "webhook"}
                  </div>
                </div>
              )
            })
          )}
        </div>

{/* RIGHT PANE - INSPECTOR */}
        <div className="col-span-8 bg-[#0B0C10] overflow-y-auto p-8">
          {!selectedDeal ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a deal from the queue to inspect</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Deal Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedDeal.deal_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      {selectedDeal.lender_name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      {selectedDeal.deal_size ? `$${(selectedDeal.deal_size/1000000).toFixed(1)}M` : "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {selectedDeal.source || "webhook"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      {selectedDeal.geography || "—"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {selectedDeal.industry || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider ${getStatusColor(selectedDeal.ai_decision).replace("text-", "bg-").replace("500", "950/40")} border ${getStatusColor(selectedDeal.ai_decision).replace("text-", "border-").replace("500", "800/60")} ${getStatusColor(selectedDeal.ai_decision).replace("text-", "text-")}`}>
                    {getStatusLabel(selectedDeal.ai_decision)}
                  </span>
                </div>
              </div>

              {/* Mandate Checks */}
              {selectedDeal.mandate_checks && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Mandate Checks
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(selectedDeal.mandate_checks).map(([key, passed]) => (
                      <div key={key} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${passed ? "text-emerald-500" : "text-rose-500"}`} />
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
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">AI Evidence</h3>
                <div className="bg-zinc-900/50 p-4 rounded-lg font-mono text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-800">
                  {selectedDeal.evidence || "No evidence recorded."}
                </div>
              </div>

              {/* Missing Info */}
              {selectedDeal.missing_info && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Missing Information
                  </h3>
                  <div className="bg-amber-950/30 p-4 rounded-lg text-sm text-amber-300 whitespace-pre-wrap border border-amber-800/50">
                    {selectedDeal.missing_info}
                  </div>
                </div>
              )}

              {/* Next Best Action */}
              {selectedDeal.next_best_action && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Next Best Action
                  </h3>
                  <div className="bg-blue-950/30 p-4 rounded-lg text-sm text-blue-300 whitespace-pre-wrap border border-blue-800/50">
                    {selectedDeal.next_best_action}
                  </div>
                </div>
              )}

              {/* Email Draft */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Email Draft</h3>
                <div className="bg-zinc-900/50 p-4 rounded-lg font-mono text-sm text-zinc-300 whitespace-pre-wrap border border-zinc-800">
                  {selectedDeal.email_draft || "No draft generated."}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedDeal.human_status === "PENDING" && (
                <div className="flex flex-wrap gap-4 pt-4 border-t border-zinc-800">
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "REJECT")}
                    className="px-6 py-3 rounded-lg bg-transparent border-2 border-rose-500 text-rose-400 font-semibold hover:bg-rose-950/20 transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "HOLD")}
                    className="px-6 py-3 rounded-lg bg-transparent border-2 border-amber-500 text-amber-400 font-semibold hover:bg-amber-950/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Hold
                  </button>
                  <button 
                    onClick={() => openOverrideModal(selectedDeal, "NURTURE")}
                    className="px-6 py-3 rounded-lg bg-transparent border-2 border-blue-500 text-blue-400 font-semibold hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Nurture
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedDeal)}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isSubmitting ? "Processing..." : "Approve & Advance"}
                  </button>
                </div>
              )}

              {/* Human Status Display */}
              {selectedDeal.human_status !== "PENDING" && (
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
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