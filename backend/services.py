import json
import os

import requests
from groq import Groq

from schemas import DealEvaluation


def filter_mandates(deal: dict, mandates: list[dict]) -> list[dict]:
    eligible_lenders: list[dict] = []

    for lender in mandates:
        if deal["ebitda"] < lender["min_ebitda"]:
            continue
        if deal["leverage"] > lender["max_leverage"]:
            continue
        if deal["geography"] not in lender["allowed_geography"]:
            continue
        eligible_lenders.append(lender)

    return eligible_lenders


def evaluate_qualitative_fit(deal: dict, lender: dict) -> DealEvaluation:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    prompt = (
        "You are a private credit triage copilot. Evaluate if the deal context violates "
        "the lender's qualitative exclusion policy.\n\n"
        f"Lender: {lender['name']}\n"
        f"Qualitative Exclusion: {lender['qualitative_exclusion']}\n"
        f"Deal Context: {deal['context_text']}\n\n"
        "Return JSON only with keys: decision, evidence, email_draft. "
        "decision must be one of ADVANCE, HOLD_MISSING_DATA, REJECT."
    )

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    content = completion.choices[0].message.content or "{}"
    payload = json.loads(content)
    return DealEvaluation.model_validate(payload)


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
