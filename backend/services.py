import json
import os
from typing import Optional

import requests
from groq import Groq

from schemas import DealEvaluation


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


def evaluate_qualitative_fit(deal: dict, lender: dict) -> DealEvaluation:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = (
        "You are a private credit triage copilot. Evaluate the deal against the lender's mandate.\n\n"
        f"Lender: {lender['name']}\n"
        f"Qualitative Exclusion: {lender['qualitative_exclusion']}\n"
        f"Deal Context: {deal['context_text']}\n"
        f"Deal EBITDA: ${deal.get('ebitda', 'N/A'):,}\n"
        f"Deal Leverage: {deal.get('leverage', 'N/A')}x\n"
        f"Deal Geography: {deal.get('geography', 'N/A')}\n"
        f"Deal Industry: {deal.get('industry', 'N/A')}\n"
        f"Deal Size: ${deal.get('deal_size', 'N/A'):,}\n\n"
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
        "- REJECT: Clearly outside mandate or violates exclusion policy"
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
