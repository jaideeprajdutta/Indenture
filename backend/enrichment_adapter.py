"""Enrichment Adapter - Abstract interface for deal enrichment providers"""

import os
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import hashlib


@dataclass
class EnrichmentResult:
    """Result of an enrichment operation."""
    success: bool
    provider: str
    data: Optional[dict] = None
    error: Optional[str] = None
    confidence: Optional[float] = None


class EnrichmentProvider:
    """Base enrichment provider interface."""
    
    def __init__(self):
        self.enabled = False
        self.provider_name = "base"
    
    def is_enabled(self) -> bool:
        return self.enabled
    
    def enrich_deal(self, deal_data: dict) -> EnrichmentResult:
        """Enrich a deal with additional data. To be implemented by subclasses."""
        raise NotImplementedError


class DemoEnrichmentProvider(EnrichmentProvider):
    """Demo enrichment provider that returns deterministic synthetic data."""
    
    def __init__(self):
        super().__init__()
        self.provider_name = "demo"
        self.enabled = os.getenv("ENRICHMENT_DEMO_ENABLED", "true").lower() == "true"
    
    def _deterministic_hash(self, deal_name: str, lender_name: str, field: str) -> int:
        """Generate deterministic hash for consistent synthetic data."""
        seed = f"{deal_name}|{lender_name}|{field}".encode()
        return int(hashlib.md5(seed).hexdigest(), 16)
    
    def _pick_website(self, deal_name: str, lender_name: str) -> str:
        domains = [
            "example.com", "company.io", "business.co", "firm.net", "enterprise.org",
            "ventures.com", "capital.io", "partners.co", "group.net", "holdings.org"
        ]
        idx = self._deterministic_hash(deal_name, lender_name, "website") % len(domains)
        prefix = deal_name.lower().replace("-", "").replace(" ", "")
        return f"https://{prefix}.{domains[idx]}"
    
    def _pick_revenue(self, deal_name: str, lender_name: str, deal_size: Optional[float]) -> float:
        base = deal_size or 50000000
        hash_val = self._deterministic_hash(deal_name, lender_name, "revenue")
        multiplier = 0.5 + (hash_val % 200) / 100.0  # 0.5x to 2.5x
        return round(base * multiplier, 2)
    
    def _pick_employee_count(self, deal_name: str, lender_name: str, revenue: float) -> int:
        hash_val = self._deterministic_hash(deal_name, lender_name, "employees")
        if revenue > 100000000:
            base_range = (200, 2000)
        elif revenue > 50000000:
            base_range = (100, 500)
        elif revenue > 10000000:
            base_range = (50, 200)
        else:
            base_range = (10, 100)
        return base_range[0] + (hash_val % (base_range[1] - base_range[0]))
    
    def _pick_ownership_type(self, deal_name: str, lender_name: str) -> str:
        types = ["Private", "Private Equity Backed", "Family Owned", "Management Owned", "Public"]
        idx = self._deterministic_hash(deal_name, lender_name, "ownership") % len(types)
        return types[idx]
    
    def _pick_transaction_type(self, deal_name: str, lender_name: str) -> str:
        types = ["LBO", "Growth Capital", "Recapitalization", "Acquisition Finance", "Refinancing", "M&A"]
        idx = self._deterministic_hash(deal_name, lender_name, "transaction") % len(types)
        return types[idx]
    
    def enrich_deal(self, deal_data: dict) -> EnrichmentResult:
        """Enrich a deal with synthetic but deterministic data."""
        if not self.enabled:
            return EnrichmentResult(
                success=False,
                provider="demo",
                data=None,
                error="Demo enrichment provider is disabled",
                confidence=None
            )
        
        deal_name = deal_data.get("deal_name", "")
        lender_name = deal_data.get("lender_name", "")
        deal_size = deal_data.get("deal_size")
        
        website = self._pick_website(deal_name, lender_name)
        revenue = self._pick_revenue(deal_name, lender_name, deal_size)
        employee_count = self._pick_employee_count(deal_name, lender_name, revenue)
        ownership_type = self._pick_ownership_type(deal_name, lender_name)
        transaction_type = self._pick_transaction_type(deal_name, lender_name)
        
        confidence = 0.85 + (self._deterministic_hash(deal_name, lender_name, "confidence") % 15) / 100.0
        
        data = {
            "website": website,
            "revenue": revenue,
            "employee_count": employee_count,
            "ownership_type": ownership_type,
            "transaction_type": transaction_type,
        }
        
        return EnrichmentResult(
            success=True,
            provider="demo",
            data=data,
            error=None,
            confidence=round(confidence, 2)
        )


def get_enrichment_provider() -> EnrichmentProvider:
    """Factory function to get the appropriate enrichment provider."""
    return DemoEnrichmentProvider()


def enrich_deal(supabase, deal_queue_id: int, deal_name: str, lender_name: str, 
                deal_data: dict) -> EnrichmentResult:
    """
    Enrich a deal and record the result in deal_history.
    
    Args:
        supabase: Supabase client
        deal_queue_id: ID of the deal in deal_queue
        deal_name: Name of the deal
        lender_name: Name of the lender
        deal_data: Deal data including existing fields
    
    Returns:
        EnrichmentResult with success/failure and enriched data if successful
    """
    provider = get_enrichment_provider()
    
    result = provider.enrich_deal(deal_data)
    
    try:
        if result.success and result.data:
            supabase.table("deal_queue").update({
                "enrichment_status": "ENRICHED",
                "enrichment_source": provider.provider_name,
                "enrichment_confidence": result.confidence,
                "enriched_at": datetime.utcnow().isoformat(),
                "website": result.data.get("website"),
                "revenue": result.data.get("revenue"),
                "employee_count": result.data.get("employee_count"),
                "ownership_type": result.data.get("ownership_type"),
                "transaction_type": result.data.get("transaction_type"),
            }).eq("id", deal_queue_id).execute()
        else:
            supabase.table("deal_queue").update({
                "enrichment_status": "FAILED",
                "enrichment_source": provider.provider_name,
                "enrichment_confidence": None,
                "enriched_at": datetime.utcnow().isoformat(),
            }).eq("id", deal_queue_id).execute()
    except Exception as e:
        print(f"Warning: Failed to update deal_queue with enrichment info: {e}")
    
    try:
        from main import record_history
        record_history(
            supabase=supabase,
            deal_queue_id=deal_queue_id,
            deal_name=deal_name,
            lender_name=lender_name,
            event_type="ENRICHMENT_COMPLETED" if result.success else "ENRICHMENT_FAILED",
            previous_decision=None,
            new_decision=None,
            reason=f"Enriched via {provider.provider_name.upper()}" + (f": {result.error}" if result.error else f" (confidence: {result.confidence})"),
        )
    except Exception as e:
        print(f"Warning: Failed to record enrichment history: {e}")
    
    return result