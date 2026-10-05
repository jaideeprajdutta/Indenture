from enum import Enum

from pydantic import BaseModel
from typing import Optional


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


class MandateCheck(BaseModel):
    ebitda_check: bool
    leverage_check: bool
    geography_check: bool
    eligible: bool


class MandateReevaluation(BaseModel):
    before: MandateCheck
    after: MandateCheck
    newly_satisfied: list[str]
    newly_failed: list[str]
    unchanged: list[str]
    eligibility_changed: bool
    was_eligible: bool
    now_eligible: bool
