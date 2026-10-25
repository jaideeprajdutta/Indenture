"use client";

import { useState, useCallback } from "react";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface HistoryEvent {
  id: number;
  deal_queue_id: number;
  deal_name: string;
  lender_name: string;
  event_type: string;
  previous_decision: string | null;
  new_decision: string | null;
  reason: string | null;
  created_at: string;
}

export interface UseHistoryReturn {
  history: HistoryEvent[];
  loading: boolean;
  error: string | null;
  fetchHistory: (dealName: string, lenderName: string) => Promise<void>;
  clearHistory: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (dealName: string, lenderName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${backendUrl}/deal/history?deal_name=${encodeURIComponent(dealName)}&lender_name=${encodeURIComponent(lenderName)}`
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch history";
      console.error("History fetch error:", err);
      setError(message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setError(null);
  }, []);

  return {
    history,
    loading,
    error,
    fetchHistory,
    clearHistory,
  };
}