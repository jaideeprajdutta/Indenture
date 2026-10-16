"use client";

import React from "react";
import { DealQueueRow } from "./DealQueueRow";
import { Skeleton } from "@/components/ui";
import type { Deal } from "@/lib/hooks/useDeals";

interface DealQueueProps {
  deals: Deal[];
  selectedDealId: number | null;
  loading: boolean;
  emptyMessage?: string;
  onSelectDeal: (deal: Deal) => void;
  className?: string;
}

export function DealQueue({
  deals,
  selectedDealId,
  loading,
  emptyMessage = "Inbox Zero",
  onSelectDeal,
  className = "",
}: DealQueueProps) {
  if (loading) {
    return (
      <div className={className} role="list" aria-label="Deal queue loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="card" className="mb-2" />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className}`} role="status">
        <svg className="w-10 h-10 mb-3 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-body-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`} role="list" aria-label="Deal queue">
      {deals.map((deal) => (
        <DealQueueRow
          key={deal.id}
          deal={deal}
          isSelected={selectedDealId === deal.id}
          onClick={() => onSelectDeal(deal)}
        />
      ))}
    </div>
  );
}