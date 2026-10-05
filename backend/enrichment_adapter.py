"""Enrichment Adapter - Abstract interface for deal enrichment providers"""

import os
import json
import requests
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from pathlib import Path
import hashlib


@dataclass
class EnrichmentResult:
    """Result of an enrichment operation."""
    success: bool
    provider: str
    data: Optional[dict] = None
    error: Optional[str] = None
    confidence: Optional[float] = None
    mandate_reevaluation: Optional[dict] = None
    ai_reevaluation: Optional[dict] = None


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


class ApolloEnrichmentProvider(EnrichmentProvider):
    """Apollo.io Organization Enrichment API provider."""
    
    def __init__(self):
        super().__init__()
        self.provider_name = "apollo"
        self.enabled = os.getenv("APOLLO_ENABLED", "false").lower() == "true"
        self.api_key = os.getenv("APOLLO_API_KEY", "")
        self.base_url = "https://api.apollo.io/api/v1/organizations/enrich"
    
    def _extract_domain(self, deal_data: dict) -> Optional[str]:
        """Extract and validate domain from deal data for Apollo lookup."""
        # Try website first
        website = deal_data.get("website")
        if website:
            # Extract domain from URL
            import re
            match = re.search(r'https?://(?:www\.)?([^/]+)', website)
            if match:
                domain = match.group(1).strip().lower()
                if self._is_valid_real_domain(domain):
                    return domain
        
        # No valid domain found
        return None
    
    def _is_valid_real_domain(self, domain: str) -> bool:
        """
        Validate that a domain looks like a real company domain.
        Rejects obvious synthetic/test values.
        """
        if not domain or len(domain) < 4:
            return False
        
        # Must have at least one dot (e.g., example.com)
        if '.' not in domain:
            return False
        
        # Reject obvious synthetic/test patterns
        synthetic_patterns = [
            'test', 'demo', 'fake', 'mock', 'local', 
            'staging', 'dev', 'sandbox', 'temp', 'sample', 'placeholder',
            'aienriched', 'enriched', 'synthetic', 'simulated'
        ]
        domain_lower = domain.lower()
        
        # Check if the subdomain part matches synthetic patterns exactly or as full words
        parts = domain_lower.split('.')
        subdomain = parts[0]
        
        # Reject if subdomain is exactly a synthetic pattern or contains them as distinct parts
        for pattern in synthetic_patterns:
            if subdomain == pattern or subdomain.startswith(pattern + '-') or subdomain.endswith('-' + pattern):
                return False
        
        # Reject if any part matches exactly (but allow "example" in TLD position)
        for i, part in enumerate(parts[:-1]):  # exclude TLD
            if part in synthetic_patterns:
                return False
        
        # Reject domains that are just random strings or too short
        # Real domains typically have meaningful subdomain + TLD
        if len(parts) < 2:
            return False
        
        # TLD should be reasonable (2+ chars)
        tld = parts[-1]
        if len(tld) < 2 or len(tld) > 10:
            return False
        
        # Subdomain should not be just random characters
        subdomain = parts[0]
        if len(subdomain) < 2:
            return False
        
        # Reject if subdomain looks like a hash or random string (alphanumeric, very long)
        if subdomain.isalnum() and len(subdomain) > 20:
            return False
        
        return True
    
    def _map_apollo_response(self, apollo_data: dict) -> dict:
        """Map Apollo response to our enrichment contract."""
        organization = apollo_data.get("organization", {})
        if not organization:
            return {}
        
        mapped = {}
        
        # Website - Apollo provides website_url
        if organization.get("website_url"):
            mapped["website"] = organization["website_url"]
        
        # Revenue - Apollo provides estimated_annual_revenue
        if organization.get("estimated_annual_revenue") is not None:
            try:
                mapped["revenue"] = float(organization["estimated_annual_revenue"])
            except (ValueError, TypeError):
                pass
        
        # Employee count - Apollo provides employee_count
        if organization.get("employee_count") is not None:
            try:
                mapped["employee_count"] = int(organization["employee_count"])
            except (ValueError, TypeError):
                pass
        
        # Ownership type - Apollo doesn't directly provide this
        # We leave it null as instructed
        
        # Transaction type - Apollo doesn't provide this
        # We leave it null as instructed
        
        return mapped
    
    def enrich_deal(self, deal_data: dict) -> EnrichmentResult:
        """Enrich a deal using Apollo API."""
        if not self.enabled:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error="Apollo enrichment provider is disabled",
                confidence=None
            )
        
        if not self.api_key:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error="Apollo API key not configured",
                confidence=None
            )
        
        domain = self._extract_domain(deal_data)
        if not domain:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error="Could not determine a valid real company domain for Apollo enrichment. Provide a valid company website with a real domain.",
                confidence=None
            )
        
        headers = {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
        }
        
        params = {"domain": domain}
        
        try:
            response = requests.get(
                self.base_url,
                headers=headers,
                params=params,
                timeout=30
            )
            
            if response.status_code == 404:
                return EnrichmentResult(
                    success=False,
                    provider="apollo",
                    data=None,
                    error=f"No organization found for domain: {domain}",
                    confidence=None
                )
            
            if response.status_code == 401:
                return EnrichmentResult(
                    success=False,
                    provider="apollo",
                    data=None,
                    error="Invalid Apollo API key",
                    confidence=None
                )
            
            if response.status_code == 422:
                # Capture Apollo's error details for better debugging
                error_detail = "Apollo validation error (422): domain may be invalid or not processable"
                try:
                    error_data = response.json()
                    if isinstance(error_data, dict):
                        if 'error' in error_data:
                            error_detail = f"Apollo 422: {error_data['error']}"
                        elif 'errors' in error_data:
                            error_detail = f"Apollo 422: {error_data['errors']}"
                        elif 'detail' in error_data:
                            error_detail = f"Apollo 422: {error_data['detail']}"
                        else:
                            error_detail = f"Apollo 422: {error_data}"
                except Exception:
                    pass
                return EnrichmentResult(
                    success=False,
                    provider="apollo",
                    data=None,
                    error=error_detail,
                    confidence=None
                )
            
            if response.status_code == 429:
                return EnrichmentResult(
                    success=False,
                    provider="apollo",
                    data=None,
                    error="Apollo API rate limit exceeded",
                    confidence=None
                )
            
            response.raise_for_status()
            apollo_response = response.json()
            
            mapped_data = self._map_apollo_response(apollo_response)
            
            if not mapped_data:
                return EnrichmentResult(
                    success=False,
                    provider="apollo",
                    data=None,
                    error="Apollo returned no mappable enrichment data",
                    confidence=None
                )
            
            # Apollo doesn't provide confidence, estimate based on data completeness
            confidence = 0.7
            if mapped_data.get("revenue") is not None:
                confidence += 0.1
            if mapped_data.get("employee_count") is not None:
                confidence += 0.1
            if mapped_data.get("website") is not None:
                confidence += 0.1
            
            return EnrichmentResult(
                success=True,
                provider="apollo",
                data=mapped_data,
                error=None,
                confidence=round(min(confidence, 0.95), 2)
            )
            
        except requests.exceptions.Timeout:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error="Apollo API timeout",
                confidence=None
            )
        except requests.exceptions.RequestException as e:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error=f"Apollo API request failed: {str(e)}",
                confidence=None
            )
        except Exception as e:
            return EnrichmentResult(
                success=False,
                provider="apollo",
                data=None,
                error=f"Apollo enrichment failed: {str(e)}",
                confidence=None
            )


def get_enrichment_provider() -> EnrichmentProvider:
    """Factory function to get the appropriate enrichment provider."""
    # Priority: Apollo if enabled, otherwise Demo
    if os.getenv("APOLLO_ENABLED", "false").lower() == "true" and os.getenv("APOLLO_API_KEY"):
        return ApolloEnrichmentProvider()
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
    # First, capture the original mandate checks and original AI decision
    from main import get_supabase_client
    from services import evaluate_mandate_checks, compare_mandate_checks, evaluate_qualitative_fit
    from schemas import Decision
    
    # Get lender data to evaluate mandates
    data_path = Path(__file__).parent / "data.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    current_lender = next((l for l in payload["lenders"] if l["name"] == lender_name), None)
    
    original_mandate_checks = None
    original_ai_decision = deal_data.get("ai_decision")
    original_evidence = deal_data.get("evidence")
    if current_lender:
        original_mandate_checks = evaluate_mandate_checks(deal_data, current_lender)
    
    provider = get_enrichment_provider()
    
    result = provider.enrich_deal(deal_data)
    
    mandate_reevaluation = None
    ai_reevaluation = None
    
    try:
        if result.success and result.data:
            # Merge enriched data with deal_data for mandate re-evaluation
            enriched_deal = {**deal_data, **result.data}
            
            # Re-evaluate mandates with enriched data
            if current_lender:
                new_mandate_checks = evaluate_mandate_checks(enriched_deal, current_lender)
                if original_mandate_checks:
                    reevaluation = compare_mandate_checks(original_mandate_checks, new_mandate_checks)
                    mandate_reevaluation = reevaluation.model_dump()
                    
                    # Store mandate re-evaluation in deal_queue
                    supabase.table("deal_queue").update({
                        "mandate_reevaluation": mandate_reevaluation,
                    }).eq("id", deal_queue_id).execute()
            
            # Run AI re-evaluation with enriched data
            if current_lender:
                try:
                    ai_eval = evaluate_qualitative_fit(enriched_deal, current_lender)
                    new_decision = ai_eval.decision.value
                    ai_reevaluation = {
                        "decision": new_decision,
                        "evidence": ai_eval.evidence,
                        "email_draft": ai_eval.email_draft,
                        "missing_info": ai_eval.missing_info,
                        "next_best_action": ai_eval.next_best_action,
                        "previous_decision": original_ai_decision,
                        "previous_evidence": original_evidence,
                    }
                    
                    # Update deal_queue with new AI decision
                    supabase.table("deal_queue").update({
                        "ai_decision": new_decision,
                        "evidence": ai_eval.evidence,
                        "email_draft": ai_eval.email_draft,
                        "missing_info": ai_eval.missing_info,
                        "next_best_action": ai_eval.next_best_action,
                        "ai_reevaluation": ai_reevaluation,
                    }).eq("id", deal_queue_id).execute()
                    
                    # Record AI re-evaluation in history
                    from main import record_history
                    reason = f"AI re-evaluation after enrichment. Previous: {original_ai_decision} → New: {new_decision}"
                    if mandate_reevaluation and mandate_reevaluation.get("eligibility_changed"):
                        reason += f" (Mandate eligibility changed: {mandate_reevaluation.get('was_eligible')} → {mandate_reevaluation.get('now_eligible')})"
                    
                    record_history(
                        supabase=supabase,
                        deal_queue_id=deal_queue_id,
                        deal_name=deal_name,
                        lender_name=lender_name,
                        event_type="AI_REEVALUATION",
                        previous_decision=original_ai_decision,
                        new_decision=new_decision,
                        reason=reason,
                    )
                except Exception as e:
                    print(f"Warning: AI re-evaluation failed: {e}")
            
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
    
    result.mandate_reevaluation = mandate_reevaluation
    result.ai_reevaluation = ai_reevaluation
    return result