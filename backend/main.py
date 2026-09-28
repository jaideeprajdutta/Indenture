import json
import os
import random
from pathlib import Path
from urllib.parse import urlparse
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

from schemas import ApproveRequest, Decision
from services import evaluate_qualitative_fit, filter_mandates, push_to_crm

load_dotenv()

app = FastAPI(title="indenture-core")

origins = [
    origin.strip()
    for origin in os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be configured")

    try:
        parsed = urlparse(supabase_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError
    except Exception:
        raise RuntimeError("SUPABASE_URL must be a valid HTTP/HTTPS URL")

    if not supabase_url.startswith("https://") or not supabase_url.endswith(".supabase.co"):
        raise RuntimeError("SUPABASE_URL must start with https:// and end with .supabase.co")

    _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client


def record_history(supabase: Client, deal_queue_id: int, deal_name: str, lender_name: str, 
                   event_type: str, previous_decision: str | None = None, 
                   new_decision: str | None = None, reason: str | None = None) -> None:
    """Record a history event for a deal."""
    try:
        supabase.table("deal_history").insert({
            "deal_queue_id": deal_queue_id,
            "deal_name": deal_name,
            "lender_name": lender_name,
            "event_type": event_type,
            "previous_decision": previous_decision,
            "new_decision": new_decision,
            "reason": reason,
        }).execute()
    except Exception as e:
        # Log but don't fail the main operation
        print(f"Warning: Failed to record history: {e}")


class SimulateDealRequest(BaseModel):
    deal_name: str
    deal_size: Optional[float] = None
    industry: Optional[str] = None
    geography: Optional[str] = None
    ebitda: Optional[float] = None
    leverage: Optional[float] = None
    source: str = "simulated"
    context_text: str


class MandateSandboxRequest(BaseModel):
    lender_name: str
    min_ebitda: Optional[int] = None
    max_leverage: Optional[float] = None
    allowed_geography: Optional[list[str]] = None
    min_deal_size: Optional[int] = None
    allowed_industry: Optional[list[str]] = None


@app.post("/webhook/evaluate-deal")
def evaluate_deal_webhook() -> dict:
    data_path = Path(__file__).parent / "data.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))

    lenders = payload["lenders"]
    deal = payload["incoming_deal"]

    eligible_lenders = filter_mandates(deal, lenders)
    if not eligible_lenders:
        return {"deal_id": deal["deal_id"], "inserted": 0, "results": []}

    supabase = get_supabase_client()
    results: list[dict] = []

    for lender in eligible_lenders:
        evaluation = evaluate_qualitative_fit(deal, lender)
        
        mandate_checks = {
            "ebitda_check": deal["ebitda"] >= lender["min_ebitda"],
            "leverage_check": deal["leverage"] <= lender["max_leverage"],
            "geography_check": deal["geography"] in lender["allowed_geography"],
        }
        
        record = {
            "deal_name": deal["target_name"],
            "lender_name": lender["name"],
            "deal_size": deal.get("deal_size"),
            "industry": deal.get("industry"),
            "geography": deal.get("geography"),
            "ebitda": deal.get("ebitda"),
            "leverage": deal.get("leverage"),
            "source": deal.get("source", "webhook"),
            "ai_decision": evaluation.decision.value,
            "evidence": evaluation.evidence,
            "email_draft": evaluation.email_draft,
            "missing_info": evaluation.missing_info,
            "next_best_action": evaluation.next_best_action,
            "mandate_checks": mandate_checks,
            "human_status": "PENDING",
        }
        supabase.table("deal_queue").insert(record).execute()
        results.append(record)

    return {"deal_id": deal["deal_id"], "inserted": len(results), "results": results}


def generate_synthetic_deal() -> dict:
    industries = [
        ("Healthcare Technology", "Strong recurring revenue, high margins, regulatory moats"),
        ("B2B SaaS", "Predictable ARR, low churn, scalable model"),
        ("Industrial Manufacturing", "Cyclical exposure, asset-heavy, stable customer base"),
        ("Consumer Products", "Brand loyalty, distribution advantages, margin pressure"),
        ("Financial Services", "Regulated, rate-sensitive, sticky deposits"),
        ("Business Services", "Recurring contracts, low capex, fragmented market"),
        ("Specialty Chemicals", "Niche positioning, high switching costs, ESG tailwinds"),
        ("Food & Beverage", "Defensive, brand-driven, input cost volatility"),
    ]
    geographies = ["USA", "Canada", "UK", "Germany", "France"]
    sources = ["simulated", "webhook", "referral", "conference"]
    
    name = f"Deal-{random.randint(1000, 9999)}"
    industry, industry_ctx = random.choice(industries)
    
    profile = random.randint(0, 3)
    if profile == 0:
        ebitda = random.randint(12000000, 25000000)
        leverage = round(random.uniform(2.0, 3.0), 1)
        context = f"{industry_ctx}. Clean balance sheet at {leverage}x leverage. 3 years audited financials. Stable cash flows."
        geography = random.choice(["USA", "Canada"])
    elif profile == 1:
        ebitda = random.randint(6000000, 15000000)
        leverage = round(random.uniform(2.5, 4.5), 1)
        context = f"{industry_ctx}. Moderate leverage at {leverage}x. Some customer concentration. Turnaround in progress."
        geography = random.choice(["USA", "UK"])
    elif profile == 2:
        ebitda = random.randint(4000000, 8000000)
        leverage = round(random.uniform(2.0, 3.5), 1)
        context = f"{industry_ctx}. Growing platform at {leverage}x. Early stage but strong unit economics. 2 years audited financials."
        geography = random.choice(["USA", "Germany", "France"])
    else:
        ebitda = random.randint(3500000, 8000000)
        leverage = round(random.uniform(3.0, 5.0), 1)
        context = f"{industry_ctx}. High leverage at {leverage}x. Aggressive growth strategy with acquisition pipeline."
        geography = random.choice(["USA", "Germany", "France"])
    
    deal_size = ebitda * random.randint(8, 14)
    
    return {
        "deal_id": f"SIM-{random.randint(100000, 999999)}",
        "target_name": name,
        "deal_size": deal_size,
        "industry": industry,
        "geography": geography,
        "ebitda": ebitda,
        "leverage": leverage,
        "source": random.choice(sources),
        "context_text": context,
    }


@app.post("/deals/simulate")
def simulate_inbound_deal(request: Optional[SimulateDealRequest] = None) -> dict:
    data_path = Path(__file__).parent / "data.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    lenders = payload["lenders"]

    if request is None:
        deal = generate_synthetic_deal()
    else:
        deal = {
            "deal_id": f"SIM-{int(os.urandom(4).hex(), 16)}",
            "target_name": request.deal_name,
            "deal_size": request.deal_size,
            "industry": request.industry,
            "geography": request.geography,
            "ebitda": request.ebitda,
            "leverage": request.leverage,
            "source": request.source,
            "context_text": request.context_text,
        }

    eligible_lenders = filter_mandates(deal, lenders)
    if not eligible_lenders:
        return {"deal_id": deal["deal_id"], "inserted": 0, "results": [], "message": "No eligible lenders after mandate checks"}

    supabase = get_supabase_client()
    results: list[dict] = []

    for lender in eligible_lenders:
        evaluation = evaluate_qualitative_fit(deal, lender)
        
        mandate_checks = {
            "ebitda_check": deal.get("ebitda", 0) >= lender["min_ebitda"],
            "leverage_check": deal.get("leverage", 999) <= lender["max_leverage"],
            "geography_check": deal.get("geography", "") in lender["allowed_geography"],
        }
        
        record = {
            "deal_name": deal["target_name"],
            "lender_name": lender["name"],
            "deal_size": deal.get("deal_size"),
            "industry": deal.get("industry"),
            "geography": deal.get("geography"),
            "ebitda": deal.get("ebitda"),
            "leverage": deal.get("leverage"),
            "source": deal.get("source", "simulated"),
            "ai_decision": evaluation.decision.value,
            "evidence": evaluation.evidence,
            "email_draft": evaluation.email_draft,
            "missing_info": evaluation.missing_info,
            "next_best_action": evaluation.next_best_action,
            "mandate_checks": mandate_checks,
            "human_status": "PENDING",
        }
        insert_response = supabase.table("deal_queue").insert(record).execute()
        inserted = insert_response.data[0] if insert_response.data else None
        if inserted:
            record_history(supabase, inserted["id"], deal["target_name"], lender["name"],
                          "AI_DECISION", None, evaluation.decision.value, "Initial AI evaluation")
        results.append(record)

    return {"deal_id": deal["deal_id"], "inserted": len(results), "results": results}


@app.get("/analytics")
def get_analytics() -> dict:
    supabase = get_supabase_client()
    
    response = supabase.table("deal_queue").select("*").execute()
    deals = response.data or []
    
    if not deals:
        return {
            "total_deals": 0,
            "advance_pct": 0,
            "hold_pct": 0,
            "nurture_pct": 0,
            "reject_pct": 0,
            "avg_deal_size": 0,
            "deals_by_source": {},
            "advanced_by_source": {},
        }
    
    total = len(deals)
    decisions = [d.get("ai_decision", "") for d in deals]
    advance_count = decisions.count("ADVANCE")
    hold_count = decisions.count("HOLD") + decisions.count("HOLD_MISSING_DATA")
    nurture_count = decisions.count("NURTURE")
    reject_count = decisions.count("REJECT")
    
    deal_sizes = [d.get("deal_size") for d in deals if d.get("deal_size")]
    avg_deal_size = sum(deal_sizes) / len(deal_sizes) if deal_sizes else 0
    
    # Deals by source
    deals_by_source = {}
    for d in deals:
        source = d.get("source", "unknown")
        deals_by_source[source] = deals_by_source.get(source, 0) + 1
    
    # Advanced deals by source
    advanced_by_source = {}
    rejected_by_source = {}
    for d in deals:
        if d.get("ai_decision") == "ADVANCE":
            source = d.get("source", "unknown")
            advanced_by_source[source] = advanced_by_source.get(source, 0) + 1
        elif d.get("ai_decision") == "REJECT":
            source = d.get("source", "unknown")
            rejected_by_source[source] = rejected_by_source.get(source, 0) + 1
    
    return {
        "total_deals": total,
        "advance_pct": round(advance_count / total * 100, 1),
        "hold_pct": round(hold_count / total * 100, 1),
        "nurture_pct": round(nurture_count / total * 100, 1),
        "reject_pct": round(reject_count / total * 100, 1),
        "avg_deal_size": round(avg_deal_size, 0),
        "deals_by_source": deals_by_source,
        "advanced_by_source": advanced_by_source,
        "rejected_by_source": rejected_by_source,
    }


@app.get("/deal/history")
def get_deal_history(deal_name: str, lender_name: str) -> dict:
    """Get decision history for a specific deal."""
    supabase = get_supabase_client()
    
    # Get the deal queue ID
    deal = supabase.table("deal_queue").select("id").eq("deal_name", deal_name).eq("lender_name", lender_name).execute()
    if not deal.data:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")
    
    deal_queue_id = deal.data[0]["id"]
    
    # Get history
    history = supabase.table("deal_history").select("*").eq("deal_queue_id", deal_queue_id).order("created_at", desc=False).execute()
    
    return {"history": history.data}


def check_mandate_eligibility(deal: dict, lender: dict) -> dict:
    """Check if a deal passes all mandate checks for a lender."""
    ebitda = deal.get("ebitda") or 0
    leverage = deal.get("leverage") or 999
    geography = deal.get("geography") or ""
    checks = {
        "ebitda_check": ebitda >= lender.get("min_ebitda", 0),
        "leverage_check": leverage <= lender.get("max_leverage", 999),
        "geography_check": geography in lender.get("allowed_geography", []),
    }
    checks["eligible"] = all(checks.values())
    return checks


@app.post("/mandate-sandbox/simulate")
def simulate_mandate_changes(request: MandateSandboxRequest) -> dict:
    """Simulate mandate changes against existing deal_queue."""
    supabase = get_supabase_client()
    
    # Get current mandates
    data_path = Path(__file__).parent / "data.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    current_lenders = payload["lenders"]
    
    # Find the target lender
    current_lender = next((l for l in current_lenders if l["name"] == request.lender_name), None)
    if not current_lender:
        raise HTTPException(status_code=404, detail=f"Lender {request.lender_name} not found")
    
    # Create simulated lender with overrides
    simulated_lender = current_lender.copy()
    if request.min_ebitda is not None:
        simulated_lender["min_ebitda"] = request.min_ebitda
    if request.max_leverage is not None:
        simulated_lender["max_leverage"] = request.max_leverage
    if request.allowed_geography is not None:
        simulated_lender["allowed_geography"] = request.allowed_geography
    if request.min_deal_size is not None:
        simulated_lender["min_deal_size"] = request.min_deal_size
    if request.allowed_industry is not None:
        simulated_lender["allowed_industry"] = request.allowed_industry
    
    # Fetch all deals from queue
    response = supabase.table("deal_queue").select("*").execute()
    deals = response.data or []
    
    # Filter deals for this lender
    lender_deals = [d for d in deals if d.get("lender_name") == request.lender_name]
    
    if not lender_deals:
        return {
            "lender_name": request.lender_name,
            "current_mandate": current_lender,
            "simulated_mandate": simulated_lender,
            "eligible_before": 0,
            "eligible_after": 0,
            "newly_eligible": 0,
            "no_longer_eligible": 0,
            "unchanged": 0,
            "decision_distribution": {},
            "deal_details": [],
        }
    
    # Evaluate each deal against both mandates
    newly_eligible = []
    no_longer_eligible = []
    unchanged_eligible = []
    unchanged_ineligible = []
    
    for deal in lender_deals:
        current_checks = check_mandate_eligibility(deal, current_lender)
        simulated_checks = check_mandate_eligibility(deal, simulated_lender)
        
        current_eligible = current_checks["eligible"]
        simulated_eligible = simulated_checks["eligible"]
        
        deal_detail = {
            "deal_name": deal.get("deal_name"),
            "deal_size": deal.get("deal_size"),
            "industry": deal.get("industry"),
            "geography": deal.get("geography"),
            "ebitda": deal.get("ebitda"),
            "leverage": deal.get("leverage"),
            "current_eligible": current_eligible,
            "simulated_eligible": simulated_eligible,
            "current_checks": current_checks,
            "simulated_checks": simulated_checks,
            "ai_decision": deal.get("ai_decision"),
        }
        
        if not current_eligible and simulated_eligible:
            newly_eligible.append(deal_detail)
        elif current_eligible and not simulated_eligible:
            no_longer_eligible.append(deal_detail)
        elif current_eligible and simulated_eligible:
            unchanged_eligible.append(deal_detail)
        else:
            unchanged_ineligible.append(deal_detail)
    
    # Calculate simulated decision distribution (for deals that become eligible)
    decision_dist = {"ADVANCE": 0, "HOLD": 0, "NURTURE": 0, "REJECT": 0}
    for d in newly_eligible:
        decision = d["ai_decision"]
        if decision == "HOLD_MISSING_DATA":
            decision = "HOLD"
        decision_dist[decision] = decision_dist.get(decision, 0) + 1
    for d in unchanged_eligible:
        decision = d["ai_decision"]
        if decision == "HOLD_MISSING_DATA":
            decision = "HOLD"
        decision_dist[decision] = decision_dist.get(decision, 0) + 1
    
    return {
        "lender_name": request.lender_name,
        "current_mandate": current_lender,
        "simulated_mandate": simulated_lender,
        "eligible_before": len(unchanged_eligible) + len(no_longer_eligible),
        "eligible_after": len(unchanged_eligible) + len(newly_eligible),
        "newly_eligible": len(newly_eligible),
        "no_longer_eligible": len(no_longer_eligible),
        "unchanged": len(unchanged_eligible) + len(unchanged_ineligible),
        "decision_distribution": decision_dist,
        "deal_details": {
            "newly_eligible": newly_eligible,
            "no_longer_eligible": no_longer_eligible,
            "unchanged_eligible": unchanged_eligible,
            "unchanged_ineligible": unchanged_ineligible,
        },
    }


@app.get("/mandate-sandbox/lenders")
def get_sandbox_lenders() -> dict:
    """Get list of lenders with current mandates for sandbox."""
    data_path = Path(__file__).parent / "data.json"
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    return {"lenders": payload["lenders"]}


@app.post("/action/approve")
def approve_deal(request: ApproveRequest) -> dict:
    supabase = get_supabase_client()
    
    # Fetch current record to get previous decision
    current = supabase.table("deal_queue").select("id, ai_decision, human_decision").eq("deal_name", request.deal_name).eq("lender_name", request.lender_name).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")
    
    current_record = current.data[0]
    previous_decision = current_record.get("human_decision") or current_record.get("ai_decision")
    
    update_response = (
        supabase.table("deal_queue")
        .update({"human_status": "APPROVED", "human_decision": "APPROVE"})
        .eq("deal_name", request.deal_name)
        .eq("lender_name", request.lender_name)
        .execute()
    )

    updated_rows = update_response.data or []
    if not updated_rows:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")

    record_history(supabase, current_record["id"], request.deal_name, request.lender_name,
                  "HUMAN_APPROVE", previous_decision, "APPROVE", "Human approved AI decision")

    crm_response = {}
    try:
        crm_response = push_to_crm(request.deal_name, "APPROVED")
    except Exception as e:
        crm_response = {"error": str(e)}
    return {
        "status": "APPROVED",
        "deal_name": request.deal_name,
        "lender_name": request.lender_name,
        "crm_response": crm_response,
    }


@app.post("/action/override")
def override_deal(request: ApproveRequest) -> dict:
    supabase = get_supabase_client()
    
    # Fetch current record to get previous decision
    current = supabase.table("deal_queue").select("id, ai_decision, human_decision").eq("deal_name", request.deal_name).eq("lender_name", request.lender_name).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")
    
    current_record = current.data[0]
    previous_decision = current_record.get("human_decision") or current_record.get("ai_decision")
    
    override_reason = getattr(request, 'override_reason', '')
    new_decision = getattr(request, 'human_decision', '')
    
    if not new_decision or new_decision not in ["ADVANCE", "HOLD", "NURTURE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Invalid human_decision. Must be one of ADVANCE, HOLD, NURTURE, REJECT")
    
    update_response = (
        supabase.table("deal_queue")
        .update({
            "human_status": "OVERRIDDEN",
            "human_decision": new_decision,
            "override_reason": override_reason
        })
        .eq("deal_name", request.deal_name)
        .eq("lender_name", request.lender_name)
        .execute()
    )

    updated_rows = update_response.data or []
    if not updated_rows:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")

    record_history(supabase, current_record["id"], request.deal_name, request.lender_name,
                  "HUMAN_OVERRIDE", previous_decision, new_decision, override_reason)

    return {
        "status": "OVERRIDDEN",
        "deal_name": request.deal_name,
        "lender_name": request.lender_name,
        "human_decision": new_decision,
        "override_reason": override_reason,
    }
