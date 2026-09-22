from enum import Enum

from pydantic import BaseModel


class Decision(str, Enum):
    ADVANCE = "ADVANCE"
    HOLD_MISSING_DATA = "HOLD_MISSING_DATA"
    REJECT = "REJECT"


class DealEvaluation(BaseModel):
    decision: Decision
    evidence: str
    email_draft: str


class ApproveRequest(BaseModel):
    deal_name: str
    lender_name: str
