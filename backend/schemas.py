from enum import Enum

from pydantic import BaseModel


class Decision(str, Enum):
    ADVANCE = "ADVANCE"
    HOLD = "HOLD"
    NURTURE = "NURTURE"
    REJECT = "REJECT"


class DealEvaluation(BaseModel):
    decision: Decision
    evidence: str
    email_draft: str
    missing_info: str = ""
    next_best_action: str = ""


class ApproveRequest(BaseModel):
    deal_name: str
    lender_name: str
    override_reason: str = ""
    human_decision: str = ""
