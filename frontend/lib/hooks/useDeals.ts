"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface Deal {
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
  missing_info: string | null;
  next_best_action: string | null;
  mandate_checks: Record<string, boolean>;
  human_status: string;
  human_decision: string | null;
  override_reason: string | null;
  crm_provider: string | null;
  crm_status: string | null;
  crm_record_id: string | null;
  crm_routed_at: string | null;
  crm_error: string | null;
  enrichment_status: string | null;
  enrichment_source: string | null;
  enrichment_confidence: number | null;
  enriched_at: string | null;
  website: string | null;
  revenue: number | null;
  employee_count: number | null;
  ownership_type: string | null;
  transaction_type: string | null;
  mandate_reevaluation: Record<string, unknown> | null;
  ai_reevaluation: Record<string, unknown> | null;
  effective_decision: string | null;
  created_at: string;
}

export interface UseDealsOptions {
  autoFetch?: boolean;
  orderBy?: { column: string; ascending: boolean };
}

export interface UseDealsReturn {
  deals: Deal[];
  selectedDeal: Deal | null;
  setSelectedDeal: (deal: Deal | null) => void;
  loading: boolean;
  error: string | null;
  fetchDeals: (showRefresh?: boolean) => Promise<void>;
  refreshDeals: () => Promise<void>;
  optimisticRemove: (id: number) => void;
  optimisticUpdate: (id: number, updates: Partial<Deal>) => void;
}

export function useDeals(options: UseDealsOptions = {}): UseDealsReturn {
  const { autoFetch = true, orderBy = { column: "created_at", ascending: false } } = options;
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async (showRefresh = false) => {
    if (!supabase) {
      setError("Missing Supabase configuration in .env.local");
      setLoading(false);
      return;
    }

    if (showRefresh) {
      // Could set a separate refreshing state if needed
    }

    try {
      let query = supabase.from("deal_queue").select("*");
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      
      const newDeals = data || [];
      setDeals(newDeals);
      
      // Preserve selection: if a deal was selected, try to find it in the refreshed data
      if (selectedDeal) {
        const stillExists = newDeals.find((d) => d.id === selectedDeal.id);
        if (stillExists) {
          setSelectedDeal(stillExists);
        } else if (newDeals.length > 0) {
          // Selected deal no longer exists, select first deal
          setSelectedDeal(newDeals[0]);
        } else {
          // No deals at all
          setSelectedDeal(null);
        }
      } else if (newDeals.length > 0) {
        // No previous selection, select first deal
        setSelectedDeal(newDeals[0]);
      }
      
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch deals";
      console.error("Fetch deals error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [orderBy, selectedDeal]);

  const refreshDeals = useCallback(() => fetchDeals(true), [fetchDeals]);

  const optimisticRemove = useCallback((id: number) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setSelectedDeal((prev) => (prev?.id === id ? null : prev));
  }, []);

  const optimisticUpdate = useCallback((id: number, updates: Partial<Deal>) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    setSelectedDeal((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchDeals();
    }
  }, [fetchDeals, autoFetch]);

  return {
    deals,
    selectedDeal,
    setSelectedDeal,
    loading,
    error,
    fetchDeals,
    refreshDeals,
    optimisticRemove,
    optimisticUpdate,
  };
}