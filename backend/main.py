import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

from schemas import ApproveRequest
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


def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be configured")

    return create_client(supabase_url, supabase_key)


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
        record = {
            "deal_name": deal["target_name"],
            "lender_name": lender["name"],
            "ai_decision": evaluation.decision.value,
            "evidence": evaluation.evidence,
            "email_draft": evaluation.email_draft,
        }
        supabase.table("deal_queue").insert(record).execute()
        results.append(record)

    return {"deal_id": deal["deal_id"], "inserted": len(results), "results": results}


@app.post("/action/approve")
def approve_deal(request: ApproveRequest) -> dict:
    supabase = get_supabase_client()
    update_response = (
        supabase.table("deal_queue")
        .update({"human_status": "APPROVED"})
        .eq("deal_name", request.deal_name)
        .eq("lender_name", request.lender_name)
        .execute()
    )

    updated_rows = update_response.data or []
    if not updated_rows:
        raise HTTPException(status_code=404, detail="Matching deal queue record not found")

    crm_response = push_to_crm(request.deal_name, "APPROVED")
    return {
        "status": "APPROVED",
        "deal_name": request.deal_name,
        "lender_name": request.lender_name,
        "crm_response": crm_response,
    }
