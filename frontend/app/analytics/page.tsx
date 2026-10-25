"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, FileText, Settings } from "lucide-react";
import { PageShell, PageContent } from "@/components/layout";
import { PageHeader, ActionBar } from "@/components/layout";
import { Tabs, TabPanels, TabPanel, type TabItem } from "@/components/ui";
import { MetricCard, DecisionDistribution, SourceBars, SourceTable, DealLogTable } from "@/components/analytics";
import { formatCurrency } from "@/lib/utils";

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

interface DealLogRow {
  id: number;
  deal_name: string;
  lender_name: string;
  deal_size: number | null;
  source: string | null;
  ai_decision: string;
  human_status: string;
  created_at: string;
}

const tabItems: TabItem[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { key: "deals", label: "Deal Log", icon: <FileText className="w-4 h-4" /> },
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deals, setDeals] = useState<DealLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "deals">("overview");

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch analytics";
      setError(message);
    }
  }, []);

  const fetchDeals = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error: queryError } = await supabase
        .from("deal_queue")
        .select("id,deal_name,lender_name,deal_size,source,ai_decision,human_status,created_at")
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      setDeals(data || []);
    } catch (err: unknown) {
      console.error("Fetch deals error:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      await Promise.all([fetchAnalytics(), fetchDeals()]);
      if (mounted) setLoading(false);
    };
    loadData();
    return () => { mounted = false; };
  }, [fetchAnalytics, fetchDeals]);

  if (loading) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center h-[calc(100vh-140px)]">
          <div className="animate-pulse flex gap-3">
            <div className="w-6 h-6 bg-surface-elevated rounded" />
            <div className="w-6 h-6 bg-surface-elevated rounded" />
            <div className="w-6 h-6 bg-surface-elevated rounded" />
          </div>
        </PageContent>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-6 max-w-lg text-center">
            <h2 className="text-heading-md text-foreground mb-2">Failed to load analytics</h2>
            <p className="text-body-sm text-muted-foreground font-mono">{error}</p>
          </div>
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="INDENTURE — Analytics"
        icon={<BarChart3 className="w-5 h-5 text-muted-foreground" />}
        navigation={[
          { label: "Triage", href: "/", icon: <FileText className="w-3.5 h-3.5" /> },
          { label: "Sandbox", href: "/sandbox", icon: <Settings className="w-3.5 h-3.5" /> },
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
        <TabPanels>
          <TabPanel key="overview" activeKey={activeTab}>
            {analytics && (
              <div className="space-y-4">
                {/* KEY METRICS ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricCard label="Total Deals" value={analytics.total_deals} />
                  <MetricCard label="ADVANCE %" value={`${analytics.advance_pct}%`} color="success" />
                  <MetricCard label="HOLD %" value={`${analytics.hold_pct}%`} color="warning" />
                  <MetricCard label="NURTURE %" value={`${analytics.nurture_pct}%`} color="info" />
                  <MetricCard label="REJECT %" value={`${analytics.reject_pct}%`} color="danger" />
                  <MetricCard label="Avg Deal Size" value={formatCurrency(analytics.avg_deal_size)} />
                </div>

                {/* DECISION DISTRIBUTION + DEALS BY SOURCE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DecisionDistribution analytics={analytics} />
                  <SourceBars analytics={analytics} />
                </div>

                {/* SOURCE PERFORMANCE TABLE */}
                <SourceTable analytics={analytics} deals={deals} />
              </div>
            )}
          </TabPanel>

          <TabPanel key="deals" activeKey={activeTab}>
            <DealLogTable deals={deals} />
          </TabPanel>
        </TabPanels>
      </PageContent>
    </PageShell>
  );
}