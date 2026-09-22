"use client";

import { createClient } from "@supabase/supabase-js";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DealQueueRecord = {
  id: number;
  deal_name: string;
  lender_name: string;
  ai_decision: "ADVANCE" | "HOLD_MISSING_DATA" | "REJECT" | string;
  evidence: string;
  email_draft: string;
  human_status: string;
};

const decisionColors: Record<string, string> = {
  ADVANCE: "text-emerald-700 bg-emerald-100",
  HOLD_MISSING_DATA: "text-amber-700 bg-amber-100",
  REJECT: "text-rose-700 bg-rose-100",
};

export default function Home() {
  const [records, setRecords] = useState<DealQueueRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return null;
    }
    return createClient(url, key);
  }, []);

  const fetchPending = useCallback(async () => {
    if (!supabase) {
      setError("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("deal_queue")
      .select("*")
      .eq("human_status", "PENDING")
      .order("id", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setIsLoading(false);
      return;
    }

    const nextRecords = (data ?? []) as DealQueueRecord[];
    setRecords(nextRecords);
    setDrafts(
      nextRecords.reduce<Record<number, string>>((acc, row) => {
        acc[row.id] = row.email_draft;
        return acc;
      }, {})
    );
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const approveAndSync = async (row: DealQueueRecord) => {
    setApprovingId(row.id);
    setError(null);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
      const response = await fetch(`${backendUrl}/action/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: row.deal_name,
          lender_name: row.lender_name,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(errorPayload || "Approve request failed.");
      }

      setRecords((prev) => prev.filter((item) => item.id !== row.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected approve error.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Indenture HITL Triage Desk
        </h1>
        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        {isLoading ? (
          <p className="text-sm text-slate-600">Loading pending triage queue...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-slate-600">No pending triage records.</p>
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {records.map((row) => (
              <article
                key={row.id}
                className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <span className="font-semibold text-slate-700">Deal:</span>{" "}
                    {row.deal_name}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Lender:</span>{" "}
                    {row.lender_name}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                      decisionColors[row.ai_decision] ??
                      "text-slate-700 bg-slate-100"
                    }`}
                  >
                    AI State: {row.ai_decision}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-800">
                    Evidence Citation:
                  </span>{" "}
                  {row.evidence}
                </p>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Email Draft
                  <textarea
                    className="min-h-28 rounded-md border border-slate-300 p-2 text-sm text-slate-800"
                    value={drafts[row.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => approveAndSync(row)}
                  disabled={approvingId === row.id}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approvingId === row.id ? "Syncing..." : "Approve & Sync"}
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
