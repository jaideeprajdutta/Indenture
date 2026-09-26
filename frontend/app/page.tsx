"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Activity, Database, AlertCircle, CheckCircle2, 
  XCircle, RefreshCw, Briefcase, Mail, ShieldAlert, 
  ChevronRight, Inbox, Send, Archive
} from "lucide-react";

// Initialize Supabase safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function IndentureCommandCenter() {
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const filteredDeals = deals.filter(d => 
    filter === "ALL" ? true : (d.human_status || "PENDING") === filter
  );

  const getStatusColor = (decision: string) => {
    switch(decision?.toUpperCase()) {
      case "REJECT": return "text-rose-500";
      case "HOLD_MISSING_DATA": return "text-amber-500";
      case "APPROVE": return "text-emerald-500";
      default: return "text-zinc-500";
    }
  };

  const getStatusLabel = (decision: string) => {
    switch(decision?.toUpperCase()) {
      case "REJECT": return "REJECT";
      case "HOLD_MISSING_DATA": return "HOLD";
      case "APPROVE": return "APPROVE";
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
        <button 
          onClick={() => fetchDeals(true)}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          SYNC FEED
        </button>
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
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                    <Briefcase className="w-3.5 h-3.5" />
                    {deal.lender_name}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* RIGHT PANE - INSPECTOR */}
        <div className="col-span-8 bg-[#0B0C10] overflow-y-auto p-8 relative">
          {!selectedDeal ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a deal from the queue to inspect</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              
              {/* Deal Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-zinc-500 font-mono text-xs">ID: {selectedDeal.id}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-700" />
                  <span className="text-zinc-500 font-mono text-xs">Live Triage</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-6">{selectedDeal.deal_name}</h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#07080B] border border-white/[0.04] p-4 rounded-lg">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Target Lender</p>
                    <p className="font-mono text-sm text-zinc-200">{selectedDeal.lender_name}</p>
                  </div>
                  <div className="bg-[#07080B] border border-white/[0.04] p-4 rounded-lg">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Human Status</p>
                    <p className="font-mono text-sm text-zinc-200">{selectedDeal.human_status || "PENDING"}</p>
                  </div>
                </div>
              </div>

              {/* Evidence Box */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  AI Qualitative Evidence
                </h3>
                <div className="bg-[#07080B] border border-indigo-900/30 p-5 rounded-xl font-mono text-sm leading-relaxed text-indigo-200/80 shadow-inner">
                  {selectedDeal.evidence || "No evidence recorded."}
                </div>
              </div>

              {/* Email Draft Box */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Generated Outreach Draft
                </h3>
                <div className="bg-[#07080B] border border-white/[0.04] p-5 rounded-xl font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap shadow-inner relative group">
                  {selectedDeal.email_draft || "No draft generated."}
                </div>
              </div>

              {/* Action Footer */}
              {selectedDeal.human_status === "PENDING" && (
                <div className="fixed bottom-0 right-0 w-2/3 p-6 bg-gradient-to-t from-[#0B0C10] via-[#0B0C10] to-transparent">
                  <div className="flex gap-4 justify-end max-w-4xl mx-auto">
                    <button 
                      onClick={() => handleOptimisticAction(selectedDeal.id, "REJECTED")}
                      className="px-6 py-3 rounded-lg bg-[#07080B] border border-rose-900/50 text-rose-400 font-semibold hover:bg-rose-950/40 transition-all flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Reject & Archive
                    </button>
                    <button 
                      onClick={() => handleOptimisticAction(selectedDeal.id, "APPROVED")}
                      className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Approve & Sync to CRM
                    </button>
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