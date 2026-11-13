"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, FileText, Settings, Activity } from "lucide-react";
import { PageShell, PageContent } from "@/components/layout";
import { PageHeader, ActionBar } from "@/components/layout";
import { Button, Tabs, TabPanels, TabPanel, Panel, type TabItem } from "@/components/ui";
import { MetricCard, DecisionDistribution, SourceBars, SourceTable, DealLogTable, PipelineHealth, type DealLogRow } from "@/components/analytics";
import { formatCurrency, normalizeDecision } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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

const tabItems: TabItem[] = [
  { key: "overview", label: "Pipeline Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "deals", label: "Deal Log", icon: <FileText className="w-4 h-4" /> },
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deals, setDeals] = useState<DealLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deals">("overview");
  const analyticsRequestIdRef = useRef(0);
  const dealsRequestIdRef = useRef(0);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++analyticsRequestIdRef.current;
    try {
      const res = await fetch(`${backendUrl}/analytics`);
      if (requestId !== analyticsRequestIdRef.current) return;
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      if (requestId !== analyticsRequestIdRef.current) return;
      setAnalytics(data);
      setError(null);
    } catch (err: unknown) {
      if (requestId !== analyticsRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(message);
    }
  }, []);

  const fetchDeals = useCallback(async () => {
    if (!supabase) return;

    const requestId = ++dealsRequestIdRef.current;
    try {
      const { data, error: queryError } = await supabase
        .from("deal_queue")
        .select("id,deal_name,lender_name,deal_size,source,ai_decision,human_status,human_decision,missing_info,next_best_action,crm_status,crm_error,created_at")
        .order("created_at", { ascending: false });
      if (requestId !== dealsRequestIdRef.current) return;
      if (queryError) throw queryError;
      setDeals(data || []);
      setDealsError(null);
    } catch (err: unknown) {
      if (requestId !== dealsRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to fetch deal log";
      console.error("Fetch deals error:", err);
      setDealsError(message);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([fetchAnalytics(), fetchDeals()]);
  }, [fetchAnalytics, fetchDeals]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadData().finally(() => {
        if (!cancelled) setLoading(false);
      });
    });
    return () => {
      cancelled = true;
      analyticsRequestIdRef.current += 1;
      dealsRequestIdRef.current += 1;
    };
  }, [loadData]);

  const handleRetry = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const pageError = error || dealsError;

  if (loading && !analytics && deals.length === 0) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center h-[calc(100vh-140px)]">
          <div className="animate-pulse flex gap-3">
            <div className="w-6 h-6 bg-muted rounded-full" />
            <div className="w-6 h-6 bg-muted rounded-full" />
            <div className="w-6 h-6 bg-muted rounded-full" />
          </div>
        </PageContent>
      </PageShell>
    );
  }

  if (pageError && !analytics && !loading) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-6 max-w-lg text-center">
            <h2 className="text-heading-md text-foreground mb-2">Pipeline intelligence unavailable</h2>
            <p className="text-body-sm text-muted-foreground font-mono">{pageError}</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={handleRetry} loading={refreshing}>
              Retry
            </Button>
          </div>
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="INDENTURE"
        subtitle="Pipeline Intelligence"
        icon={<BarChart3 className="w-5 h-5 text-muted-foreground" />}
        navigation={[
          { label: "Deal Ops", href: "/", icon: <Activity className="w-3.5 h-3.5" /> },
          { label: "Pipeline Intel", href: "/analytics", icon: <BarChart3 className="w-3.5 h-3.5" />, active: true },
          { label: "Scenarios", href: "/sandbox", icon: <Settings className="w-3.5 h-3.5" /> },
        ]}
      />
      <ActionBar>
        <Tabs
          tabs={tabItems}
          activeKey={activeTab}
          onChange={(key: string) => setActiveTab(key as "overview" | "deals")}
          variant="underline"
        />
      </ActionBar>
      <PageContent className="p-4">
        {pageError && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-danger/20 bg-danger/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-danger">{pageError}</p>
            <Button variant="ghost" size="sm" onClick={handleRetry} loading={refreshing}>
              Retry
            </Button>
          </div>
        )}
        <TabPanels>
          <TabPanel tabKey="overview" activeKey={activeTab}>
            {analytics ? (
              <div className="space-y-4">
                {/* PIPELINE METRICS — counts from the live deal log; nothing estimated */}
                {(() => {
                  const pending = deals.filter((d) => (d.human_status || "PENDING") === "PENDING").length;
                  const qualified = deals.filter((d) => normalizeDecision(d.ai_decision) === "ADVANCE").length;
                  const rejected = deals.filter((d) => normalizeDecision(d.ai_decision) === "REJECT").length;
                  const humanDecisions = deals.filter((d) => d.human_status === "APPROVED" || d.human_status === "OVERRIDDEN").length;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <MetricCard label="Total Opportunities" value={analytics.total_deals} />
                      <MetricCard label="Awaiting Review" value={pending} color="warning" />
                      <MetricCard label="Qualified (ADVANCE)" value={qualified} color="success" />
                      <MetricCard label="Rejected" value={rejected} color="danger" />
                      <MetricCard label="Human Decisions" value={humanDecisions} color="info" />
                      <MetricCard label="Avg Deal Size" value={formatCurrency(analytics.avg_deal_size)} />
                    </div>
                  );
                })()}

                {/* OPERATIONAL BOTTLENECKS + FOLLOW-UP QUEUE */}
                <PipelineHealth deals={deals} />

                {/* DECISION DISTRIBUTION + OPPORTUNITIES BY SOURCE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DecisionDistribution analytics={analytics} />
                  <SourceBars analytics={analytics} />
                </div>

                {/* SOURCE PERFORMANCE TABLE */}
                <SourceTable analytics={analytics} deals={deals} />
              </div>
            ) : (
              <Panel variant="default" padding="md">
                <p className="text-muted-foreground text-body-sm text-center py-8">
                  No pipeline data yet — decision metrics appear here as opportunities are processed.
                </p>
              </Panel>
            )}
          </TabPanel>

          <TabPanel tabKey="deals" activeKey={activeTab}>
            <DealLogTable deals={deals} />
          </TabPanel>
        </TabPanels>
      </PageContent>
    </PageShell>
  );
}