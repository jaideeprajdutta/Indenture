import json
import os
from typing import Optional

import requests
from groq import Groq

from schemas import DealEvaluation, MandateCheck, MandateReevaluation


def normalize_deal_for_mandates(deal: dict) -> dict:
    """
    Create a normalized deal view for mandate evaluation.
    
    Precedence: original deal fields > enriched fields > defaults
    Enriched fields only fill in missing original values.
    
    Args:
        deal: Raw deal dict (may contain enrichment fields)
    
    Returns:
        Normalized deal dict with fallback values filled in
    """
    normalized = deal.copy()
    
    # Deal size: use original if present, fallback to enriched revenue
    if normalized.get("deal_size") is None and normalized.get("revenue") is not None:
        normalized["deal_size"] = normalized["revenue"]
    
    # For fields that don't have direct enrichment mappings, keep original
    # The current enrichment fields (website, revenue, employee_count, 
    # ownership_type, transaction_type) don't directly map to:
    # - ebitda
    # - leverage  
    # - geography
    # - industry
    # So we just pass through original values
    
    return normalized


def filter_mandates(deal: dict, mandates: list[dict]) -> list[dict]:
    """Filter lenders based on mandate checks using normalized deal."""
    # Normalize deal to include enriched fields as fallbacks
    normalized_deal = normalize_deal_for_mandates(deal)
    
    eligible_lenders: list[dict] = []
    
    for lender in mandates:
        # Use .get() with safe defaults to handle missing fields
        ebitda = normalized_deal.get("ebitda", 0)
        leverage = normalized_deal.get("leverage", 999)
        geography = normalized_deal.get("geography", "")
        
        if ebitda < lender["min_ebitda"]:
            continue
        if leverage > lender["max_leverage"]:
            continue
        if geography not in lender["allowed_geography"]:
            continue
        eligible_lenders.append(lender)
    
    return eligible_lenders


def _format_enrichment_context(deal: dict) -> str:
    """Format enrichment fields for AI context, clearly labeled as enriched data."""
    enrichment_fields = {
        "website": deal.get("website"),
        "revenue": deal.get("revenue"),
        "employee_count": deal.get("employee_count"),
        "ownership_type": deal.get("ownership_type"),
        "transaction_type": deal.get("transaction_type"),
        "enrichment_source": deal.get("enrichment_source"),
        "enrichment_confidence": deal.get("enrichment_confidence"),
    }
    
    # Only include fields that have values
    present_fields = {k: v for k, v in enrichment_fields.items() if v is not None}
    
    if not present_fields:
        return ""
    
    lines = ["\n[ENRICHED DATA - Contextual evidence from external source:]"]
    for key, value in present_fields.items():
        if key == "revenue" and isinstance(value, (int, float)):
            lines.append(f"  Enriched {key}: ${value:,.0f}")
        elif key == "enrichment_confidence" and isinstance(value, (int, float)):
            lines.append(f"  Enriched {key}: {value:.0%}")
        else:
            lines.append(f"  Enriched {key}: {value}")
    lines.append("[END ENRICHED DATA]")
    return "\n".join(lines)


def evaluate_qualitative_fit(deal: dict, lender: dict) -> DealEvaluation:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    enrichment_context = _format_enrichment_context(deal)
    prompt = (
        "You are a private credit triage copilot. Evaluate the deal against the lender's mandate.\n\n"
        f"Lender: {lender['name']}\n"
        f"Qualitative Exclusion: {lender['qualitative_exclusion']}\n"
        f"Deal Context: {deal['context_text']}\n"
        f"Deal EBITDA: ${deal.get('ebitda', 'N/A'):,}\n"
        f"Deal Leverage: {deal.get('leverage', 'N/A')}x\n"
        f"Deal Geography: {deal.get('geography', 'N/A')}\n"
        f"Deal Industry: {deal.get('industry', 'N/A')}\n"
        f"Deal Size: ${deal.get('deal_size', 'N/A'):,}"
        f"{enrichment_context}\n\n"
        "Return JSON ONLY with these exact keys:\n"
        "- decision: string (ADVANCE, HOLD, NURTURE, or REJECT)\n"
        "- evidence: string (single string, not array)\n"
        "- email_draft: string\n"
        "- missing_info: string\n"
        "- next_best_action: string\n\n"
        "Decision criteria:\n"
        "- ADVANCE: Strong fit, no issues\n"
        "- HOLD: Potentially viable but missing critical information\n"
        "- NURTURE: Not suitable now but could become suitable later (e.g., too small, early stage)\n"
        "- REJECT: Clearly outside mandate or violates exclusion policy\n\n"
        "NOTE: Enriched data (marked above) is contextual evidence only. "
        "Do not change your decision solely based on enriched fields. "
        "Use them to strengthen or qualify your reasoning alongside original deal data."
    )

    models = ["openai/gpt-oss-20b"]
    last_error = None

    for model in models:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = completion.choices[0].message.content or "{}"
            payload = json.loads(content)
            
            if isinstance(payload.get("evidence"), list):
                payload["evidence"] = " ".join(str(x) for x in payload["evidence"])
            
            if "email_draft" not in payload:
                payload["email_draft"] = "No draft generated."
            if "missing_info" not in payload:
                payload["missing_info"] = ""
            if "next_best_action" not in payload:
                payload["next_best_action"] = ""
            
            return DealEvaluation.model_validate(payload)
        except Exception as e:
            last_error = e
            continue

    raise RuntimeError(f"All Groq models failed. Last error: {last_error}")


def push_to_crm(deal_name: str, status: str) -> dict:
    headers = {
        "Content-Type": "application/json",
    }
    payload = {
        "data": {
            "values": {
                "name": deal_name,
                "deal_status": status,
            }
        }
    }

    response = requests.post(
        "https://api.attio.com/v2/objects/companies/records",
        json=payload,
        headers=headers,
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def evaluate_mandate_checks(deal: dict, lender: dict) -> MandateCheck:
    """Evaluate mandate checks for a deal against a lender."""
    ebitda = deal.get("ebitda") or 0
    leverage = deal.get("leverage") or 999
    geography = deal.get("geography") or ""
    
    ebitda_check = ebitda >= lender.get("min_ebitda", 0)
    leverage_check = leverage <= lender.get("max_leverage", 999)
    geography_check = geography in lender.get("allowed_geography", [])
    
    return MandateCheck(
        ebitda_check=ebitda_check,
        leverage_check=leverage_check,
        geography_check=geography_check,
        eligible=ebitda_check and leverage_check and geography_check
    )


def compare_mandate_checks(before: MandateCheck, after: MandateCheck) -> MandateReevaluation:
    """Compare before/after mandate checks and identify changes."""
    checks = ["ebitda_check", "leverage_check", "geography_check"]
    before_dict = before.model_dump()
    after_dict = after.model_dump()
    
    newly_satisfied = []
    newly_failed = []
    unchanged = []
    
    for check in checks:
        before_val = before_dict[check]
        after_val = after_dict[check]
        if not before_val and after_val:
            newly_satisfied.append(check)
        elif before_val and not after_val:
            newly_failed.append(check)
        else:
            unchanged.append(check)
    
    eligibility_changed = before.eligible != after.eligible
    
    return MandateReevaluation(
        before=before,
        after=after,
        newly_satisfied=newly_satisfied,
        newly_failed=newly_failed,
        unchanged=unchanged,
        eligibility_changed=eligibility_changed,
        was_eligible=before.eligible,
        now_eligible=after.eligible
    )
