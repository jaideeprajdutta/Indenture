"use client";

import { useState, useCallback } from "react";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SimulationForm {
  deal_name: string;
  deal_size: string;
  industry: string;
  geography: string;
  ebitda: string;
  leverage: string;
  revenue: string;
  source: string;
  context_text: string;
  website: string;
}

export interface SimulationState {
  isOpen: boolean;
  form: SimulationForm;
}

export interface UseSimulationReturn {
  simulationState: SimulationState;
  isSimulating: boolean;
  openSimulation: () => void;
  closeSimulation: () => void;
  updateForm: (field: keyof SimulationForm, value: string) => void;
  submitSimulation: (onSuccess: () => Promise<void>) => Promise<void>;
  resetForm: () => void;
}

const initialForm: SimulationForm = {
  deal_name: "",
  deal_size: "",
  industry: "",
  geography: "",
  ebitda: "",
  leverage: "",
  revenue: "",
  source: "simulated",
  context_text: "",
  website: "",
};

export function useSimulation(): UseSimulationReturn {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isOpen: false,
    form: initialForm,
  });
  const [isSimulating, setIsSimulating] = useState(false);

  const openSimulation = useCallback(() => {
    setSimulationState({ isOpen: true, form: initialForm });
  }, []);

  const closeSimulation = useCallback(() => {
    setSimulationState({ isOpen: false, form: initialForm });
  }, []);

  const updateForm = useCallback((field: keyof SimulationForm, value: string) => {
    setSimulationState((prev) => ({
      ...prev,
      form: { ...prev.form, [field]: value },
    }));
  }, []);

  const resetForm = useCallback(() => {
    setSimulationState((prev) => ({ ...prev, form: initialForm }));
  }, []);

  const submitSimulation = useCallback(
    async (onSuccess: () => Promise<void>) => {
      const form = simulationState.form;
      if (!form.deal_name.trim() || !form.context_text.trim()) {
        alert("Deal name and context are required");
        return;
      }

      setIsSimulating(true);
      try {
        const res = await fetch(`${backendUrl}/deals/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deal_name: form.deal_name,
            deal_size: form.deal_size ? parseFloat(form.deal_size) : undefined,
            industry: form.industry || undefined,
            geography: form.geography || undefined,
            ebitda: form.ebitda ? parseFloat(form.ebitda) : undefined,
            leverage: form.leverage ? parseFloat(form.leverage) : undefined,
            revenue: form.revenue ? parseFloat(form.revenue) : undefined,
            source: form.source,
            context_text: form.context_text,
            website: form.website || undefined,
          }),
        });
        if (!res.ok) throw new Error("Simulation failed");
        
        closeSimulation();
        await onSuccess();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Simulation failed";
        console.error("Simulate error:", err);
        alert(message);
      } finally {
        setIsSimulating(false);
      }
    },
    [simulationState.form, closeSimulation]
  );

  return {
    simulationState,
    isSimulating,
    openSimulation,
    closeSimulation,
    updateForm,
    submitSimulation,
    resetForm,
  };
}