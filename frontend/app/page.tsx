"use client";

import React, { useCallback } from "react";
import { Plus, RefreshCw, Activity, Database, Settings } from "lucide-react";
import { PageShell, PageContent, ResponsiveSplitPane } from "@/components/layout";
import { PageHeader, ActionBar, FilterTabs } from "@/components/layout";
import { DealQueue, DealInspector } from "@/components/triage";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui";
import { Select } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Input } from "@/components/ui";
import { useDeals, type Deal } from "@/lib/hooks/useDeals";
import { useHistory } from "@/lib/hooks/useHistory";
import { useSimulation } from "@/lib/hooks/useSimulation";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const filterOptions = [
  { key: "PENDING", label: "PENDING" },
  { key: "ALL", label: "ALL" },
  { key: "APPROVED", label: "APPROVED" },
  { key: "REJECTED", label: "REJECTED" },
];

const overrideActionOptions = [
  { value: "", label: "Select decision...", disabled: true },
  { value: "ADVANCE", label: "ADVANCE" },
  { value: "HOLD", label: "HOLD" },
  { value: "NURTURE", label: "NURTURE" },
  { value: "REJECT", label: "REJECT" },
];

export default function IndentureCommandCenter() {
  const {
    deals,
    selectedDeal,
    setSelectedDeal,
    loading,
    error,
    fetchDeals,
    refreshDeals,
  } = useDeals();

  const { history, loading: historyLoading, fetchHistory } = useHistory();

  const {
    simulationState,
    isSimulating,
    openSimulation,
    closeSimulation,
    updateForm,
    submitSimulation,
    resetForm,
  } = useSimulation();

  const [filter, setFilter] = React.useState("PENDING");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false);
  const [overrideModal, setOverrideModal] = React.useState<{
    deal: Deal | null;
    action: string;
  } | null>(null);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [crmRouting, setCrmRouting] = React.useState<{
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [enrichment, setEnrichment] = React.useState<{
    loading: boolean;
    error: string | null;
  } | null>(null);

  const clearEnrichmentError = useCallback(() => {
    setEnrichment((prev) => (prev?.error ? { loading: false, error: null } : prev));
  }, []);

  const handleFetchDeals = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setIsRefreshing(true);
      await fetchDeals(showRefresh);
      setIsRefreshing(false);
    },
    [fetchDeals]
  );

  const handleSelectDeal = useCallback(
    (deal: Deal) => {
      clearEnrichmentError();
      setSelectedDeal(deal);
      setMobileDetailOpen(true);
      fetchHistory(deal.deal_name, deal.lender_name);
    },
    [clearEnrichmentError, fetchHistory, setSelectedDeal]
  );

  const handleMobileDetailClose = useCallback(() => {
    setMobileDetailOpen(false);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!selectedDeal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/action/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_name: selectedDeal.deal_name,
          lender_name: selectedDeal.lender_name,
        }),
      });
      if (!res.ok) throw new Error("Approve failed");
      await refreshDeals();
      await fetchHistory(selectedDeal.deal_name, selectedDeal.lender_name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Approve failed";
      console.error("Approve error:", err);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDeal, refreshDeals, fetchHistory]);

  const openOverrideModal = useCallback((deal: Deal) => {
    setOverrideModal({ deal, action: "" });
    setOverrideReason("");
  }, []);

  const handleOverride = useCallback(async () => {
    if (!overrideModal || !overrideReason.trim() || !overrideModal.action) return;
    const deal = overrideModal.deal!;
    const dealName = deal.deal_name;
    const lenderName = deal.lender_name;
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
      await refreshDeals();
      await fetchHistory(dealName, lenderName);
      setOverrideModal(null);
      setOverrideReason("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Override failed";
      console.error("Override error:", err);
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [overrideModal, overrideReason, refreshDeals, fetchHistory]);

  const handleRouteToCrm = useCallback(async () => {
    if (!selectedDeal) return;
    const dealName = selectedDeal.deal_name;
    const lenderName = selectedDeal.lender_name;
    const dealId = selectedDeal.id;
    setCrmRouting({ loading: true, error: null });
    try {
      const res = await fetch(`${backendUrl}/deals/${dealId}/route-to-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_name: dealName, lender_name: lenderName }),
      });
      if (!res.ok) throw new Error("CRM routing failed");
      await refreshDeals();
      await fetchHistory(dealName, lenderName);
      setCrmRouting(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "CRM routing failed";
      console.error("CRM routing error:", err);
      setCrmRouting({ loading: false, error: message });
    }
  }, [selectedDeal, refreshDeals, fetchHistory]);

  const handleEnrichDeal = useCallback(async () => {
    if (!selectedDeal) return;
    const dealName = selectedDeal.deal_name;
    const lenderName = selectedDeal.lender_name;
    const dealId = selectedDeal.id;
    setEnrichment({ loading: true, error: null });
    try {
      const res = await fetch(`${backendUrl}/deals/${dealId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_name: dealName, lender_name: lenderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.detail || `Enrichment failed (${res.status})`);
      }
      if (!data.success) {
        throw new Error(data.error || "Enrichment failed");
      }
      await refreshDeals();
      await fetchHistory(dealName, lenderName);
      setEnrichment(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Enrichment failed";
      console.error("Enrichment error:", err);
      setEnrichment({ loading: false, error: message });
    }
  }, [selectedDeal, refreshDeals, fetchHistory]);

  const handleSimulationSubmit = useCallback(async () => {
    await submitSimulation(async () => {
      await refreshDeals();
    });
  }, [submitSimulation, refreshDeals]);

  const filteredDeals = deals.filter((d) =>
    filter === "ALL" ? true : (d.human_status || "PENDING") === filter
  );

  if (error) {
    return (
      <PageShell>
        <PageContent className="flex items-center justify-center p-6">
          <div className="bg-surface border border-border p-6 max-w-lg text-center">
            <h2 className="text-heading-md text-foreground mb-2">System Error</h2>
            <p className="text-body-sm text-muted-foreground font-mono">{error}</p>
          </div>
        </PageContent>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="INDENTURE \u2014 HITL Triage"
        icon={<Activity className="w-5 h-5 text-muted-foreground" />}
        statusItems={[
          { label: "LLM Active", icon: <span className="w-1.5 h-1.5 rounded-full bg-success" />, status: "connected" },
          { label: "Synced", icon: <Database className="w-3.5 h-3.5" />, status: "connected" },
        ]}
        navigation={[
          { label: "Sandbox", href: "/sandbox", icon: <Settings className="w-3.5 h-3.5" /> },
        ]}
      />
      <ActionBar>
        <FilterTabs
          filters={filterOptions.map((f) => ({ key: f.key, label: f.label }))}
          activeKey={filter}
          onChange={setFilter}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="success"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={openSimulation}
            disabled={isSimulating}
            loading={isSimulating}
          >
            + Simulate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />}
            onClick={() => handleFetchDeals(true)}
            disabled={isRefreshing}
          >
            Sync
          </Button>
        </div>
      </ActionBar>
      <PageContent>
        <ResponsiveSplitPane
          left={
            <div className="h-full overflow-y-auto p-3 bg-surface">
              <DealQueue
                deals={filteredDeals}
                selectedDealId={selectedDeal?.id ?? null}
                loading={loading}
                emptyMessage="Inbox Zero"
                onSelectDeal={handleSelectDeal}
              />
            </div>
          }
          right={
            <DealInspector
              deal={selectedDeal}
              isSubmitting={isSubmitting}
              onOverride={selectedDeal ? () => openOverrideModal(selectedDeal) : () => {}}
              onRouteToCrm={handleRouteToCrm}
              onEnrichDeal={handleEnrichDeal}
              onApprove={handleApprove}
              crmRouting={crmRouting}
              enrichment={enrichment}
              history={history}
              historyLoading={historyLoading}
            />
          }
          leftWidth={360}
          minLeftWidth={320}
          maxLeftWidth={440}
          detailOpen={mobileDetailOpen && Boolean(selectedDeal)}
          onMobileDetailClose={handleMobileDetailClose}
        />
      </PageContent>

      <Modal
        isOpen={overrideModal !== null}
        onClose={() => {
          setOverrideModal(null);
          setOverrideReason("");
        }}
        title="Override AI Decision"
        size="sm"
      >
        {overrideModal && (
          <div className="space-y-4">
            {(() => {
              const deal = overrideModal.deal!;
              return (
                <>
                  <p className="text-body-sm text-muted-foreground">
                    Override <span className="font-mono text-success">{deal.ai_decision}</span> for
                    <span className="font-medium text-foreground">{deal.deal_name}</span>
                  </p>
                </>
              );
            })()}
            <Select
              label="New Decision"
              options={overrideActionOptions}
              value={overrideModal.action}
              onChange={(value) => setOverrideModal({ ...overrideModal, action: value })}
              fullWidth
              placeholder="Select decision..."
            />
            <Textarea
              label="Reason (required)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              placeholder="Explain why you're overriding the AI decision..."
              fullWidth
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => { setOverrideModal(null); setOverrideReason(""); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleOverride}
                disabled={isSubmitting || !overrideReason.trim() || !overrideModal.action}
                loading={isSubmitting}
              >
                Confirm Override
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={simulationState.isOpen}
        onClose={() => {
          closeSimulation();
          resetForm();
        }}
        title="Simulate Inbound Deal"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Deal Name *"
            value={simulationState.form.deal_name}
            onChange={(e) => updateForm("deal_name", e.target.value)}
            placeholder="e.g., Project Phoenix"
            fullWidth
          />
          <Textarea
            label="Context *"
            value={simulationState.form.context_text}
            onChange={(e) => updateForm("context_text", e.target.value)}
            rows={3}
            placeholder="Describe the deal, financials, situation..."
            fullWidth
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Deal Size ($)"
              type="number"
              value={simulationState.form.deal_size}
              onChange={(e) => updateForm("deal_size", e.target.value)}
              placeholder="50000000"
              fullWidth
            />
            <Input
              label="EBITDA ($)"
              type="number"
              value={simulationState.form.ebitda}
              onChange={(e) => updateForm("ebitda", e.target.value)}
              placeholder="12000000"
              fullWidth
            />
            <Input
              label="Leverage (x)"
              type="number"
              step="0.1"
              value={simulationState.form.leverage}
              onChange={(e) => updateForm("leverage", e.target.value)}
              placeholder="2.5"
              fullWidth
            />
            <Input
              label="Revenue ($)"
              type="number"
              value={simulationState.form.revenue}
              onChange={(e) => updateForm("revenue", e.target.value)}
              placeholder="optional"
              fullWidth
            />
            <Input
              label="Industry"
              value={simulationState.form.industry}
              onChange={(e) => updateForm("industry", e.target.value)}
              placeholder="Healthcare Technology"
              fullWidth
            />
            <Input
              label="Geography"
              value={simulationState.form.geography}
              onChange={(e) => updateForm("geography", e.target.value)}
              placeholder="USA"
              fullWidth
            />
            <Input
              label="Source"
              value={simulationState.form.source}
              onChange={(e) => updateForm("source", e.target.value)}
              placeholder="simulated"
              fullWidth
            />
            <Input
              label="Website (optional)"
              type="url"
              value={simulationState.form.website}
              onChange={(e) => updateForm("website", e.target.value)}
              placeholder="https://company.com"
              fullWidth
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => { closeSimulation(); resetForm(); }}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleSimulationSubmit}
              disabled={isSimulating || !simulationState.form.deal_name.trim() || !simulationState.form.context_text.trim()}
              loading={isSimulating}
            >
              Simulate Deal
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}