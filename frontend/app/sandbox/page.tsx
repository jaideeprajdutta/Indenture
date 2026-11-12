"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Settings, FileText, Activity, Database, BarChart3 } from "lucide-react";
import { PageShell, PageContent } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { LenderSelector, MandateControls, SummaryCard, DecisionDistribution, DealDetailSection, type Lender, type SandboxResult, type MandateForm } from "@/components/sandbox";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function CurrentMandate({ lender }: { lender: Lender | undefined }) {
  if (!lender) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Current Mandate
      </h3>
      <div className="space-y-2 text-body-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-muted-foreground">Min EBITDA</span>
          <span className="font-mono text-foreground">{lender.min_ebitda?.toLocaleString()}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-muted-foreground">Max Leverage</span>
          <span className="font-mono text-foreground">{lender.max_leverage}x</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-muted-foreground">Geography</span>
          <span className="font-mono text-foreground truncate max-w-[200px] sm:max-w-none">{lender.allowed_geography.join(", ")}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <span className="text-muted-foreground">Qualitative</span>
          <span className="font-mono text-foreground truncate max-w-[200px] sm:max-w-none">{lender.qualitative_exclusion}</span>
        </div>
      </div>
    </div>
  );
}

export default function MandateSandboxPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>("");
  const [form, setForm] = useState<MandateForm>({
    min_ebitda: "",
    max_leverage: "",
    allowed_geography: "",
    min_deal_size: "",
    allowed_industry: "",
  });
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [lendersLoading, setLendersLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lendersError, setLendersError] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const lendersRequestIdRef = useRef(0);
  const simulateRequestIdRef = useRef(0);
  const appliedLenderRef = useRef<string | null>(null);

  const fetchLenders = useCallback(async () => {
    const requestId = ++lendersRequestIdRef.current;
    setLendersLoading(true);
    try {
      const res = await fetch(`${backendUrl}/mandate-sandbox/lenders`);
      if (requestId !== lendersRequestIdRef.current) return;
      if (!res.ok) throw new Error("Failed to fetch lenders");
      const data = await res.json();
      if (requestId !== lendersRequestIdRef.current) return;
      setLenders(data.lenders);
      setLendersError(null);
      if (data.lenders.length > 0) {
        setSelectedLender((current) => current || data.lenders[0].name);
      }
    } catch (err: unknown) {
      if (requestId !== lendersRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to fetch lenders";
      setLendersError(message);
    } finally {
      if (requestId === lendersRequestIdRef.current) {
        setLendersLoading(false);
      }
    }
  }, []);

  const fetchCurrentMandate = useCallback((force = false) => {
    if (!selectedLender) return;
    if (!force && appliedLenderRef.current === selectedLender) return;

    const lender = lenders.find((l) => l.name === selectedLender);
    if (lender) {
      setForm({
        min_ebitda: lender.min_ebitda,
        max_leverage: lender.max_leverage,
        allowed_geography: lender.allowed_geography.join(", "),
        min_deal_size: "",
        allowed_industry: "",
      });
      appliedLenderRef.current = selectedLender;
    }
  }, [selectedLender, lenders]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void fetchLenders();
    });
    return () => {
      cancelled = true;
      lendersRequestIdRef.current += 1;
    };
  }, [fetchLenders]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) fetchCurrentMandate();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchCurrentMandate]);

  const handleLenderChange = useCallback((lenderName: string) => {
    simulateRequestIdRef.current += 1;
    setLoading(false);
    setSimulationError(null);
    setSelectedLender(lenderName);
  }, []);

  const handleSimulate = useCallback(async () => {
    if (!selectedLender) return;

    const requestId = ++simulateRequestIdRef.current;
    setLoading(true);
    setSimulationError(null);
    try {
      const payload: Record<string, unknown> = { lender_name: selectedLender };
      if (form.min_ebitda !== "") payload.min_ebitda = Number(form.min_ebitda);
      if (form.max_leverage !== "") payload.max_leverage = Number(form.max_leverage);
      if (form.allowed_geography.trim()) payload.allowed_geography = form.allowed_geography.split(",").map((s) => s.trim());
      if (form.min_deal_size !== "") payload.min_deal_size = Number(form.min_deal_size);
      if (form.allowed_industry.trim()) payload.allowed_industry = form.allowed_industry.split(",").map((s) => s.trim());

      const res = await fetch(`${backendUrl}/mandate-sandbox/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (requestId !== simulateRequestIdRef.current) return;
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      if (requestId !== simulateRequestIdRef.current) return;
      setResult(data);
      setSimulationError(null);
    } catch (err: unknown) {
      if (requestId !== simulateRequestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Simulation failed";
      setSimulationError(message);
    } finally {
      if (requestId === simulateRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedLender, form]);

  const handleReset = useCallback(() => {
    simulateRequestIdRef.current += 1;
    setLoading(false);
    setSimulationError(null);
    fetchCurrentMandate(true);
    setResult(null);
  }, [fetchCurrentMandate]);

  const currentLender = lenders.find((l) => l.name === selectedLender);

  const toggleDetails = useCallback((title: string) => {
    setShowDetails((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  if (lendersError && lenders.length === 0) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-6 max-w-lg text-center">
            <h2 className="text-heading-md text-foreground mb-2">Failed to load sandbox</h2>
            <p className="text-body-sm text-muted-foreground font-mono">{lendersError}</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => { void fetchLenders(); }}
              loading={lendersLoading}
            >
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
        icon={<Settings className="w-5 h-5 text-muted-foreground" />}
        statusItems={[
          { label: "LLM Active", icon: <span className="w-1.5 h-1.5 rounded-full bg-success" />, status: "connected" },
          { label: "Synced", icon: <Database className="w-3.5 h-3.5" />, status: "connected" },
        ]}
        navigation={[
          { label: "Triage", href: "/", icon: <Activity className="w-3.5 h-3.5" /> },
          { label: "Analytics", href: "/analytics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
        ]}
      />
      <PageContent className="p-4 space-y-4">
        {lendersError && lenders.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border border-danger/20 bg-danger/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-danger">{lendersError}</p>
            <Button variant="ghost" size="sm" onClick={() => { void fetchLenders(); }} loading={lendersLoading}>
              Retry
            </Button>
          </div>
        )}
        {simulationError && (
          <div className="flex flex-col gap-3 rounded-lg border border-danger/20 bg-danger/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-danger">{simulationError}</p>
            <Button variant="ghost" size="sm" onClick={handleSimulate} loading={loading}>
              Retry
            </Button>
          </div>
        )}
        <LenderSelector
          lenders={lenders}
          selectedLender={selectedLender}
          onChange={handleLenderChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentMandate lender={currentLender} />
          <MandateControls
            form={form}
            onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
            onSimulate={handleSimulate}
            onReset={handleReset}
            loading={loading}
          />
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryCard label="Eligible Before" value={result.eligible_before} color="warning" />
              <SummaryCard label="Eligible After" value={result.eligible_after} color="success" />
              <SummaryCard label="Newly Eligible" value={result.newly_eligible} color="success" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>} />
              <SummaryCard label="No Longer Eligible" value={result.no_longer_eligible} color="danger" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>} />
              <SummaryCard label="Unchanged" value={result.unchanged} color="info" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>} />
            </div>

            <DecisionDistribution result={result} />

            <div className="space-y-3">
              {result.deal_details.newly_eligible.length > 0 && (
                <DealDetailSection
                  title="Newly Eligible"
                  count={result.newly_eligible}
                  deals={result.deal_details.newly_eligible}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>}
                  color="success"
                  showDetails={showDetails}
                  toggleDetails={toggleDetails}
                />
              )}
              {result.deal_details.no_longer_eligible.length > 0 && (
                <DealDetailSection
                  title="No Longer Eligible"
                  count={result.no_longer_eligible}
                  deals={result.deal_details.no_longer_eligible}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                  color="danger"
                  showDetails={showDetails}
                  toggleDetails={toggleDetails}
                />
              )}
              {result.deal_details.unchanged_eligible.length > 0 && (
                <DealDetailSection
                  title="Unchanged Eligible"
                  count={result.deal_details.unchanged_eligible.length}
                  deals={result.deal_details.unchanged_eligible}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
                  color="info"
                  showDetails={showDetails}
                  toggleDetails={toggleDetails}
                />
              )}
              {result.deal_details.unchanged_ineligible.length > 0 && (
                <DealDetailSection
                  title="Unchanged Ineligible"
                  count={result.deal_details.unchanged_ineligible.length}
                  deals={result.deal_details.unchanged_ineligible}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                  color="default"
                  showDetails={showDetails}
                  toggleDetails={toggleDetails}
                />
              )}
            </div>
          </div>
        )}
      </PageContent>
    </PageShell>
  );
}