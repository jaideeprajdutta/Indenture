"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const DEFAULT_ORDER_BY = { column: "created_at", ascending: false } as const;

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
  const { autoFetch = true, orderBy = DEFAULT_ORDER_BY } = options;
  const orderByColumn = orderBy.column;
  const orderByAscending = orderBy.ascending;
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(
    supabase ? null : "Missing Supabase configuration in .env.local"
  );
  const requestIdRef = useRef(0);

  const fetchDeals = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!supabase) return;

    try {
      const query = supabase
        .from("deal_queue")
        .select("*")
        .order(orderByColumn, { ascending: orderByAscending });

      const { data, error: queryError } = await query;

      if (requestId !== requestIdRef.current) return;
      if (queryError) throw queryError;
      
      const newDeals = data || [];
      setDeals(newDeals);
      
      // Preserve the current selection by ID; only fall back when it no longer exists.
      setSelectedDealId((currentId) => {
        if (currentId !== null && newDeals.some((deal) => deal.id === currentId)) {
          return currentId;
        }
        return newDeals.length > 0 ? newDeals[0].id : null;
      });
      
      setError(null);
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to fetch deals";
      console.error("Fetch deals error:", err);
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [orderByColumn, orderByAscending]);

  const selectedDeal = useMemo(
    () => (selectedDealId === null ? null : deals.find((deal) => deal.id === selectedDealId) ?? null),
    [deals, selectedDealId]
  );

  const setSelectedDeal = useCallback((deal: Deal | null) => {
    setSelectedDealId(deal?.id ?? null);
  }, []);

  const refreshDeals = useCallback(() => fetchDeals(), [fetchDeals]);

  const optimisticRemove = useCallback((id: number) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setSelectedDealId((prev) => (prev === id ? null : prev));
  }, []);

  const optimisticUpdate = useCallback((id: number, updates: Partial<Deal>) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  }, []);

  useEffect(() => {
    if (!autoFetch) return;
    queueMicrotask(() => {
      void fetchDeals();
    });
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