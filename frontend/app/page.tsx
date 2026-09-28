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
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [crmRouting, setCrmRouting] = useState<{loading: boolean; error: string | null} | null>(null);

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
  
  const fetchHistory = useCallback(async (dealName: string, lenderName: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${backendUrl}/deal/history?deal_name=${encodeURIComponent(dealName)}&lender_name=${encodeURIComponent(lenderName)}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      console.error("History fetch error:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleOptimisticAction = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setDeals(deals.filter(d => d.id !== id));
    setSelectedDeal(null);
    setHistory([]);

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
      await fetchDeals();
      await fetchHistory(deal.deal_name, deal.lender_name);
    } catch (err: any) {
      console.error("Approve error:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOverrideModal = (deal: any) => {
    setOverrideModal({ deal, action: "" });
    setOverrideReason("");
  };

  const handleOverride = async () => {
    if (!overrideModal || !overrideReason.trim() || !overrideModal.action) return;
    const dealName = overrideModal.deal.deal_name;
    const lenderName = overrideModal.deal.lender_name;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/action/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: dealName,
          lender_name: lenderName,
          human_decision: overrideModal.action,
          override_reason: overrideReason,
        }),
      });
      if (!res.ok) throw new Error("Override failed");
      await fetchDeals();
      await fetchHistory(dealName, lenderName);
      setOverrideModal(null);
      setOverrideReason("");
    } catch (err: any) {
      console.error("Override error:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

const handleRouteToCrm = async () => {
    if (!selectedDeal) return;
    const dealName = selectedDeal.deal_name;
    const lenderName = selectedDeal.lender_name;
    const dealId = selectedDeal.id;
    setCrmRouting({ loading: true, error: null });
    try {
      const res = await fetch(`${backendUrl}/deals/${dealId}/route-to-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: dealName,
          lender_name: lenderName,
        }),
      });
      if (!res.ok) throw new Error("CRM routing failed");
      const data = await res.json();
      await fetchDeals();
      await fetchHistory(dealName, lenderName);
      setCrmRouting(null);
    } catch (err: any) {
      console.error("CRM routing error:", err);
      setCrmRouting({ loading: false, error: err.message });
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
            Override <span className="font-mono text-emerald-400">{overrideModal.deal.ai_decision}</span> for 
            <span className="font-medium">{overrideModal.deal.deal_name}</span>
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">New Decision</label>
            <select
              value={overrideModal.action}
              onChange={(e) => setOverrideModal({...overrideModal, action: e.target.value})}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Select decision...</option>
              <option value="ADVANCE">ADVANCE</option>
              <option value="HOLD">HOLD</option>
              <option value="NURTURE">NURTURE</option>
              <option value="REJECT">REJECT</option>
            </select>
          </div>
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
              disabled={isSubmitting || !overrideReason.trim() || !overrideModal.action}
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
    const normalized = decision?.toUpperCase() === "HOLD_MISSING_DATA" ? "HOLD" : decision?.toUpperCase();
    switch(normalized) {
      case "REJECT": return "text-rose-500";
      case "HOLD": return "text-amber-500";
      case "NURTURE": return "text-blue-500";
      case "ADVANCE": return "text-emerald-500";
      default: return "text-zinc-500";
    }
  };

  const getStatusLabel = (decision: string) => {
    const normalized = decision?.toUpperCase() === "HOLD_MISSING_DATA" ? "HOLD" : decision?.toUpperCase();
    switch(normalized) {
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
                  onClick={() => { setSelectedDeal(deal); fetchHistory(deal.deal_name, deal.lender_name); }}
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
                    onClick={() => openOverrideModal(selectedDeal)}
                    className="px-4 py-2 rounded bg-transparent border border-blue-500 text-blue-400 font-medium hover:bg-blue-950/20 flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Override
                  </button>
                  <button 
                    onClick={handleRouteToCrm}
                    disabled={isSubmitting || crmRouting?.loading}
                    className="px-4 py-2 rounded bg-transparent border border-emerald-500 text-emerald-400 font-medium hover:bg-emerald-950/20 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Activity className={`w-3.5 h-3.5 ${crmRouting?.loading ? "animate-spin" : ""}`} />
                    Route to CRM
                  </button>
                  <button 
                    onClick={() => handleApprove(selectedDeal)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {isSubmitting ? "Processing..." : "Approve & Advance"}
                  </button>
                  {crmRouting?.error && (
                    <span className="px-3 py-1.5 text-xs text-rose-400 font-mono bg-rose-950/20 border border-rose-800/50 rounded self-center">
                      CRM Error: {crmRouting.error}
                    </span>
                  )}
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

              {/* CRM Routing Status */}
              {(selectedDeal.crm_status === "ROUTED" || selectedDeal.crm_status === "FAILED") && (
                <div className="pt-3 border-t border-zinc-800">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    CRM Routing
                  </h3>
                  <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-400">Provider:</span>
                        <span className="font-mono text-zinc-200">{selectedDeal.crm_provider || "—"}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-400">Status:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider font-mono ${
                          selectedDeal.crm_status === "ROUTED" 
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/60" 
                            : "bg-rose-950/40 text-rose-400 border border-rose-800/60"
                        }`}>
                          {selectedDeal.crm_status === "ROUTED" 
                            ? (selectedDeal.crm_record_id?.startsWith("SIM-") ? "Simulated" : "Routed")
                            : "Failed"
                          }
                        </span>
                      </span>
                      {selectedDeal.crm_record_id && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-zinc-400">Record ID:</span>
                          <span className="font-mono text-zinc-200">{selectedDeal.crm_record_id}</span>
                        </span>
                      )}
                      {selectedDeal.crm_routed_at && (
                        <span className="flex items-center gap-1.5">
                          <span className="text-zinc-400">Routed:</span>
                          <span className="font-mono text-zinc-200 text-xs">{new Date(selectedDeal.crm_routed_at).toLocaleString()}</span>
                        </span>
                      )}
                      {selectedDeal.crm_error && (
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <span className="text-zinc-400">Error:</span>
                          <span className="font-mono text-sm">{selectedDeal.crm_error}</span>
                        </span>
                      )}
                    </div>
                    {selectedDeal.human_decision && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Routed decision: <span className="font-mono text-zinc-300">{selectedDeal.human_decision}</span> (overridden)
                      </p>
                    )}
                    {(!selectedDeal.human_decision && selectedDeal.ai_decision) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Routed decision: <span className="font-mono text-zinc-300">{selectedDeal.ai_decision}</span> (AI)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Decision History */}
              <div className="pt-3 border-t border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Decision History
                </h3>
                {historyLoading ? (
                  <div className="text-zinc-500 text-sm">Loading history...</div>
                ) : history.length === 0 ? (
                  <div className="text-zinc-500 text-sm">No history available</div>
                ) : (
                  <div className="space-y-2">
                    {history.map((event: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-zinc-900/50 border border-zinc-800 rounded flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            {event.event_type}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                          {event.previous_decision && (
                            <>
                              <span className="text-zinc-500">Previous:</span>
                              <span className="font-mono">{event.previous_decision}</span>
                            </>
                          )}
                          {event.previous_decision && event.new_decision && (
                            <span className="text-zinc-500 mx-1">→</span>
                          )}
                          {event.new_decision && (
                            <>
                              <span className="text-zinc-500">New:</span>
                              <span className="font-mono">{event.new_decision}</span>
                            </>
                          )}
                          {event.reason && (
                            <>
                              <span className="text-zinc-500 mx-1">|</span>
                              <span className="text-zinc-500 italic">"{event.reason}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}