"""CRM Adapter - Abstract interface for CRM integrations (HubSpot, etc.)"""

import os
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class CRMResult:
    """Result of a CRM routing operation."""
    success: bool
    provider: str
    record_id: Optional[str] = None
    error: Optional[str] = None


class CRMAdapter:
    """Base CRM adapter interface."""
    
    def __init__(self):
        self.enabled = False
        self.provider_name = "base"
    
    def is_enabled(self) -> bool:
        return self.enabled
    
    def route_deal(self, deal_data: dict) -> CRMResult:
        """Route a deal to the CRM. To be implemented by subclasses."""
        raise NotImplementedError


class HubSpotAdapter(CRMAdapter):
    """HubSpot CRM adapter."""
    
    def __init__(self):
        super().__init__()
        self.provider_name = "hubspot"
        self.access_token = os.getenv("HUBSPOT_ACCESS_TOKEN", "")
        self.enabled = os.getenv("HUBSPOT_ENABLED", "false").lower() == "true" and bool(self.access_token)
    
    def route_deal(self, deal_data: dict) -> CRMResult:
        """Route a deal to HubSpot."""
        if not self.enabled:
            return CRMResult(
                success=True,
                provider="hubspot",
                record_id=f"SIM-{int(datetime.now().timestamp() * 1000)}",
                error=None
            )
        
        # TODO: Implement actual HubSpot API call when enabled
        # For now, return simulated success
        return CRMResult(
            success=True,
            provider="hubspot",
            record_id=f"SIM-{int(datetime.now().timestamp() * 1000)}",
            error=None
        )


def get_crm_adapter() -> CRMAdapter:
    """Factory function to get the appropriate CRM adapter."""
    # Currently only HubSpot is supported
    return HubSpotAdapter()


def route_deal_to_crm(supabase, deal_queue_id: int, deal_name: str, lender_name: str, 
                      deal_data: dict) -> CRMResult:
    """
    Route a deal to CRM and record the result in deal_history.
    
    Args:
        supabase: Supabase client
        deal_queue_id: ID of the deal in deal_queue
        deal_name: Name of the deal
        lender_name: Name of the lender
        deal_data: Deal data including decision info
    
    Returns:
        CRMResult with success/failure and record ID if successful
    """
    adapter = get_crm_adapter()
    
    # Prepare deal data for CRM
    effective_decision = deal_data.get("human_decision") or deal_data.get("ai_decision")
    
    crm_payload = {
        "deal_name": deal_name,
        "lender_name": lender_name,
        "decision": effective_decision,
        "deal_size": deal_data.get("deal_size"),
        "industry": deal_data.get("industry"),
        "geography": deal_data.get("geography"),
        "ebitda": deal_data.get("ebitda"),
        "leverage": deal_data.get("leverage"),
    }
    
    result = adapter.route_deal(crm_payload)
    
    # Update deal_queue with CRM routing info
    try:
        if result.success:
            supabase.table("deal_queue").update({
                "crm_provider": adapter.provider_name,
                "crm_status": "ROUTED",
                "crm_record_id": result.record_id,
                "crm_routed_at": datetime.utcnow().isoformat(),
                "crm_error": None,
            }).eq("id", deal_queue_id).execute()
        else:
            supabase.table("deal_queue").update({
                "crm_provider": adapter.provider_name,
                "crm_status": "FAILED",
                "crm_record_id": None,
                "crm_routed_at": datetime.utcnow().isoformat(),
                "crm_error": result.error,
            }).eq("id", deal_queue_id).execute()
    except Exception as e:
        # Log but don't fail the main operation
        print(f"Warning: Failed to update deal_queue with CRM info: {e}")
    
    # Record history event
    try:
        from main import record_history
        record_history(
            supabase=supabase,
            deal_queue_id=deal_queue_id,
            deal_name=deal_name,
            lender_name=lender_name,
            event_type="CRM_ROUTED" if result.success else "CRM_ROUTE_FAILED",
            previous_decision=None,
            new_decision=effective_decision,
            reason=f"Routed to {adapter.provider_name.upper()}" + (f": {result.record_id}" if result.record_id else "") + (f". Error: {result.error}" if result.error else ""),
        )
    except Exception as e:
        print(f"Warning: Failed to record CRM history: {e}")
    
    return result