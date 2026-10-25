"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Settings, FileText } from "lucide-react";
import { PageShell, PageContent } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { LenderSelector, MandateControls, SummaryCard, DecisionDistribution, DealDetailSection } from "@/components/sandbox";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Lender {
  name: string;
  min_ebitda: number;
  max_leverage: number;
  allowed_geography: string[];
  qualitative_exclusion: string;
}

interface SandboxResult {
  lender_name: string;
  current_mandate: Lender;
  simulated_mandate: Lender;
  eligible_before: number;
  eligible_after: number;
  newly_eligible: number;
  no_longer_eligible: number;
  unchanged: number;
  decision_distribution: Record<string, number>;
  deal_details: {
    newly_eligible: any[];
    no_longer_eligible: any[];
    unchanged_eligible: any[];
    unchanged_ineligible: any[];
  };
}

interface MandateForm {
  min_ebitda: number | "";
  max_leverage: number | "";
  allowed_geography: string;
  min_deal_size: number | "";
  allowed_industry: string;
}

function CurrentMandate({ lender }: { lender: Lender | undefined }) {
  if (!lender) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-label-sm text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Current Mandate
      </h3>
      <div className="space-y-2 text-body-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Min EBITDA</span>
          <span className="font-mono text-foreground">{lender.min_ebitda?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max Leverage</span>
          <span className="font-mono text-foreground">{lender.max_leverage}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Geography</span>
          <span className="font-mono text-foreground">{lender.allowed_geography.join(", ")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Qualitative</span>
          <span className="font-mono text-foreground truncate max-w-[200px]">{lender.qualitative_exclusion}</span>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const fetchLenders = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/mandate-sandbox/lenders`);
      if (!res.ok) throw new Error("Failed to fetch lenders");
      const data = await res.json();
      setLenders(data.lenders);
      if (data.lenders.length > 0 && !selectedLender) {
        setSelectedLender(data.lenders[0].name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch lenders";
      setError(message);
    }
  }, [selectedLender]);

  const fetchCurrentMandate = useCallback(() => {
    if (!selectedLender) return;
    const lender = lenders.find((l) => l.name === selectedLender);
    if (lender) {
      setForm({
        min_ebitda: lender.min_ebitda,
        max_leverage: lender.max_leverage,
        allowed_geography: lender.allowed_geography.join(", "),
        min_deal_size: "",
        allowed_industry: "",
      });
    }
  }, [selectedLender, lenders]);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  useEffect(() => {
    fetchCurrentMandate();
  }, [fetchCurrentMandate]);

  const handleSimulate = useCallback(async () => {
    if (!selectedLender) return;
    setLoading(true);
    setError(null);
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
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Simulation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedLender, form]);

  const handleReset = useCallback(() => {
    fetchCurrentMandate();
    setResult(null);
  }, [fetchCurrentMandate]);

  const currentLender = lenders.find((l) => l.name === selectedLender);

  const toggleDetails = useCallback((title: string) => {
    setShowDetails((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  if (error) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-6 max-w-lg text-center">
            <h2 className="text-heading-md text-foreground mb-2">Error</h2>
            <p className="text-body-sm text-muted-foreground font-mono">{error}</p>
          </div>
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="INDENTURE — Mandate Sandbox"
        icon={<Settings className="w-5 h-5 text-muted-foreground" />}
        statusItems={[
          { label: "LLM Active", icon: <span className="w-1.5 h-1.5 rounded-full bg-success" />, status: "connected" },
          { label: "Synced", icon: <FileText className="w-3.5 h-3.5" />, status: "connected" },
        ]}
        navigation={[
          { label: "Triage", href: "/", icon: <FileText className="w-3.5 h-3.5" /> },
          { label: "Analytics", href: "/analytics", icon: <Settings className="w-3.5 h-3.5" /> },
        ]}
      />
      <PageContent className="p-4 space-y-4">
        <LenderSelector
          lenders={lenders}
          selectedLender={selectedLender}
          onChange={setSelectedLender}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CurrentMandate lender={currentLender} />
          <MandateControls
            currentLender={currentLender}
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