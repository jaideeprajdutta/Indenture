"""Offline harness: runs the real Indenture FastAPI app against an in-memory Supabase stub.

No network, no credentials, no live datastore. Used to verify endpoint contracts
and the full analyst workflow deterministically.

Usage:  python tools/test_backend_offline.py
"""
import json
import os
import sys
import itertools
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

# Force the demo enrichment provider and an unreachable CRM before import.
os.environ.setdefault("ENRICHMENT_DEMO_ENABLED", "true")
os.environ["APOLLO_ENABLED"] = "false"
os.environ["HUBSPOT_ENABLED"] = "false"
os.environ.pop("HUBSPOT_ACCESS_TOKEN", None)

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402


class Resp:
    def __init__(self, data):
        self.data = data


class InsertQuery:
    """Stand-in for the builder returned by supabase-py's insert(): supports .execute()."""

    def __init__(self, data):
        self.data = data

    def execute(self):
        return Resp(self.data)


# Columns whose default is supplied by Postgres, not by the application.
DB_DEFAULTS = {"deal_history": {"created_at": "2026-01-02T00:00:00+00:00"}}


class Query:
    def __init__(self, store, table):
        self.store = store
        self.table = table
        self.rows = list(store[table])
        self.filters = []
        self.order_by = None
        self.limit_n = None
        self._single = False
        self.patch = None
        self.to_delete = False

    # --- builders ---
    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def in_(self, col, vals):
        self.filters.append((col, list(vals)))
        return self

    def order(self, col, desc=False):
        self.order_by = (col, desc)
        return self

    def limit(self, n):
        self.limit_n = n
        return self

    def single(self):
        self._single = True
        return self

    # --- terminal ---
    def _match(self, row):
        for col, val in self.filters:
            if row.get(col) != val:
                return False
        return True

    def _select(self):
        rows = [dict(r) for r in self.rows if self._match(r)]
        if self.order_by:
            col, desc = self.order_by
            rows.sort(key=lambda r: (r.get(col) is None, r.get(col) or 0), reverse=desc)
        if self.limit_n is not None:
            rows = rows[: self.limit_n]
        return rows

    def execute(self):
        if self.to_delete:
            keep = [r for r in self.rows if not self._match(r)]
            removed = len(self.rows) - len(keep)
            self.store[self.table] = keep
            return Resp([{"deleted": removed}])
        if self.patch is not None:
            rows = [r for r in self.rows if self._match(r)]
            for r in rows:
                r.update(self.patch)
            return Resp([dict(r) for r in rows])
        rows = self._select()
        if self._single:
            return Resp(rows[0] if rows else None)
        return Resp(rows)

    def insert(self, payload):
        items = payload if isinstance(payload, list) else [payload]
        out = []
        for item in items:
            row = dict(item)
            if "id" not in row:
                row["id"] = next(self.store["_ids"])
            for col, default in DB_DEFAULTS.get(self.table, {}).items():
                if row.get(col) is None:
                    row[col] = default
            self.store[self.table].append(row)
            out.append(dict(row))
        self.rows = list(self.store[self.table])
        return InsertQuery(out)

    def update(self, patch):
        self.patch = patch
        return self

    def delete(self):
        self.to_delete = True
        return self


class FakeSupabase:
    def __init__(self):
        self.store = {
            "_ids": itertools.count(5000),
            "deal_queue": [],
            "deal_history": [],
        }

    def table(self, name):
        self.store.setdefault(name, [])
        return Query(self.store, name)


FIXTURE_DEAL = {
    "id": 9001,
    "deal_name": "Northwind Test Partners",
    "lender_name": "Blue Owl",
    "deal_size": 60_000_000,
    "industry": "B2B SaaS",
    "geography": "USA",
    "ebitda": 15_000_000,
    "leverage": 2.5,
    "revenue": 48_000_000,
    "source": "simulated",
    "website": "https://northwind-test.example",
    "context_text": "Recurring revenue, low churn, 3 years audited financials available.",
    "ai_decision": "HOLD",
    "evidence": "Recurring revenue with low churn; leverage inside mandate.",
    "email_draft": "Draft outreach email.",
    "missing_info": "Audited financials for FY-2.",
    "next_best_action": "Request FY-2 audit.",
    "mandate_checks": {
        "ebitda_check": True,
        "leverage_check": True,
        "geography_check": True,
    },
    "human_status": "PENDING",
    "created_at": "2026-01-01T00:00:00+00:00",
}

FIXTURE_HISTORY = [
    {
        "id": 1,
        "deal_queue_id": 9001,
        "deal_name": "Northwind Test Partners",
        "lender_name": "Blue Owl",
        "event_type": "AI_DECISION",
        "previous_decision": None,
        "new_decision": "HOLD",
        "reason": "Initial AI evaluation",
        "created_at": "2026-01-01T00:00:00+00:00",
    }
]

results = []


def check(name, condition, detail=""):
    results.append((name, bool(condition), detail))
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail and not condition else ""))


def install_fake():
    fake = FakeSupabase()
    fake.store["deal_queue"].append(dict(FIXTURE_DEAL))
    fake.store["deal_history"].append(dict(FIXTURE_HISTORY[0]))
    main._supabase_client = fake
    return fake


def section(title):
    print(f"\n--- {title} " + "-" * max(0, 60 - len(title)))


def main_test():
    fake = install_fake()
    client = TestClient(main.app, raise_server_exceptions=False)

    section("Route registration")
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]
    expected = [
        "/webhook/evaluate-deal",
        "/deals/simulate",
        "/analytics",
        "/deal/history",
        "/mandate-sandbox/simulate",
        "/mandate-sandbox/lenders",
        "/action/approve",
        "/action/override",
        "/deals/{deal_id}/enrich",
        "/deals/{deal_id}/route-to-crm",
    ]
    for route in expected:
        check(f"route {route}", route in paths)

    section("GET /mandate-sandbox/lenders")
    r = client.get("/mandate-sandbox/lenders")
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("returns lenders list", isinstance(body.get("lenders"), list) and len(body["lenders"]) == 3,
          str(body)[:120])
    lender_keys = {"name", "min_ebitda", "max_leverage", "allowed_geography", "qualitative_exclusion"}
    check("lender contract keys", lender_keys <= set(body["lenders"][0]), str(sorted(body["lenders"][0])))

    section("GET /deal/history")
    r = client.get("/deal/history", params={"deal_name": FIXTURE_DEAL["deal_name"],
                                            "lender_name": FIXTURE_DEAL["lender_name"]})
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("history key present", "history" in body)
    check("history is list", isinstance(body.get("history"), list))

    r = client.get("/deal/history", params={"deal_name": "__nope__", "lender_name": "__nope__"})
    check("unknown deal -> 404", r.status_code == 404, str(r.status_code))

    section("GET /analytics")
    r = client.get("/analytics")
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    for key in ("total_deals", "advance_pct", "hold_pct", "nurture_pct", "reject_pct",
                "avg_deal_size", "deals_by_source", "advanced_by_source", "rejected_by_source"):
        check(f"analytics has {key}", key in body)
    check("total_deals == 1", body["total_deals"] == 1, str(body["total_deals"]))

    section("POST /mandate-sandbox/simulate")
    r = client.post("/mandate-sandbox/simulate",
                    json={"lender_name": "Blue Owl", "max_leverage": 3.0})
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    for key in ("lender_name", "current_mandate", "simulated_mandate", "eligible_before",
                "eligible_after", "newly_eligible", "no_longer_eligible", "unchanged",
                "decision_distribution", "deal_details"):
        check(f"simulate has {key}", key in body)
    for key in ("newly_eligible", "no_longer_eligible", "unchanged_eligible", "unchanged_ineligible"):
        check(f"deal_details has {key}", key in body.get("deal_details", {}))
    check("current mandate is the unmodified stored mandate",
          body["current_mandate"]["max_leverage"] == 5.0, str(body["current_mandate"]))
    check("simulated mandate reflects override", body["simulated_mandate"]["max_leverage"] == 3.0,
          str(body["simulated_mandate"]))

    section("Sandbox deal-detail field names (frontend contract)")
    any_detail = None
    for bucket in body["deal_details"].values():
        if bucket:
            any_detail = bucket[0]
            break
    check("a deal detail was returned", any_detail is not None)
    if any_detail:
        check("detail has simulated_checks (frontend reads this)",
              "simulated_checks" in any_detail, str(sorted(any_detail)))
        check("detail has current_checks", "current_checks" in any_detail)
        check("simulated_checks has ebitda_check",
              "ebitda_check" in (any_detail.get("simulated_checks") or {}))

    section("Sandbox zero-deal branch")
    r = client.post("/mandate-sandbox/simulate",
                    json={"lender_name": "Blue Owl", "min_ebitda": 999_000_000, "max_leverage": 0.1})
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("eligible_after == 0", body["eligible_after"] == 0, str(body["eligible_after"]))
    check("deal_details present with 4 empty buckets",
          set(body["deal_details"]) == {"newly_eligible", "no_longer_eligible",
                                       "unchanged_eligible", "unchanged_ineligible"},
          str(sorted(body["deal_details"])))

    r = client.post("/mandate-sandbox/simulate", json={"lender_name": "Nonexistent Lender"})
    check("unknown lender -> 404", r.status_code == 404, str(r.status_code))

    section("POST /action/override")
    r = client.post("/action/override", json={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"],
        "human_decision": "ADVANCE",
        "override_reason": "Test override reason",
    })
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("status OVERRIDDEN", body.get("status") == "OVERRIDDEN", str(body.get("status")))
    check("effective_decision ADVANCE", body.get("effective_decision") == "ADVANCE")
    check("crm routing simulated", body["crm_routing"]["success"] is True, str(body["crm_routing"]))

    row = fake.store["deal_queue"][0]
    check("human_status persisted", row["human_status"] == "OVERRIDDEN", row["human_status"])
    check("override_reason persisted", row["override_reason"] == "Test override reason")
    check("crm_status persisted", row["crm_status"] == "ROUTED", str(row.get("crm_status")))
    events = [h["event_type"] for h in fake.store["deal_history"]]
    check("HUMAN_OVERRIDE recorded", "HUMAN_OVERRIDE" in events, str(events))
    check("CRM_ROUTED recorded", "CRM_ROUTED" in events, str(events))

    r = client.post("/action/override", json={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"],
        "human_decision": "MAYBE",
        "override_reason": "invalid",
    })
    check("invalid decision -> 400", r.status_code == 400, str(r.status_code))

    section("POST /action/approve")
    r = client.post("/action/approve", json={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"],
    })
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("status APPROVED", body.get("status") == "APPROVED", str(body.get("status")))
    row = fake.store["deal_queue"][0]
    check("human_status APPROVED", row["human_status"] == "APPROVED", row["human_status"])
    check("effective_decision set", row.get("effective_decision") == "HOLD", str(row.get("effective_decision")))
    events = [h["event_type"] for h in fake.store["deal_history"]]
    check("HUMAN_APPROVE recorded", "HUMAN_APPROVE" in events, str(events))

    section("POST /deals/{id}/enrich")
    r = client.post(f"/deals/{FIXTURE_DEAL['id']}/enrich", json={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"],
    })
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("success true", body.get("success") is True, str(body.get("error")))
    check("provider demo", body.get("provider") == "demo", str(body.get("provider")))
    check("mandate_reevaluation present", "mandate_reevaluation" in body)
    check("ai_reevaluation present", "ai_reevaluation" in body)
    row = fake.store["deal_queue"][0]
    check("enrichment_status ENRICHED", row.get("enrichment_status") == "ENRICHED", str(row.get("enrichment_status")))
    check("website enriched", bool(row.get("website")), str(row.get("website")))
    check("revenue enriched", row.get("revenue") is not None, str(row.get("revenue")))

    r = client.post(f"/deals/{FIXTURE_DEAL['id']}/enrich", json={
        "deal_name": "__wrong__", "lender_name": FIXTURE_DEAL["lender_name"]})
    check("mismatched name -> 404", r.status_code == 404, str(r.status_code))

    section("POST /deals/{id}/route-to-crm")
    r = client.post(f"/deals/{FIXTURE_DEAL['id']}/route-to-crm", json={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"],
    })
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("success true (simulated CRM)", body.get("success") is True, str(body))
    check("record id is SIM- prefixed", str(body.get("record_id", "")).startswith("SIM-"), str(body.get("record_id")))
    check("provider hubspot", body.get("provider") == "hubspot", str(body.get("provider")))

    section("POST /deals/simulate")
    r = client.post("/deals/simulate", json={
        "deal_name": "Offline Harness Deal",
        "deal_size": 40_000_000,
        "industry": "B2B SaaS",
        "geography": "USA",
        "ebitda": 12_000_000,
        "leverage": 2.0,
        "source": "simulated",
        "context_text": "Test context for offline harness.",
    })
    body = r.json()
    check("status 200", r.status_code == 200, str(r.status_code))
    check("deal_id returned", "deal_id" in body, str(list(body)))
    check("inserted >= 1", body.get("inserted", 0) >= 1, str(body.get("inserted")))
    check("no eligible lenders branch is a valid contract",
          "inserted" in body and "results" in body)

    section("History association integrity")
    hist = client.get("/deal/history", params={
        "deal_name": FIXTURE_DEAL["deal_name"],
        "lender_name": FIXTURE_DEAL["lender_name"]}).json()["history"]
    check("history rows all belong to fixture deal",
          all(h["deal_name"] == FIXTURE_DEAL["deal_name"] for h in hist))
    check("every history row carries the deal_queue_id",
          all(h.get("deal_queue_id") == FIXTURE_DEAL["id"] for h in hist),
          str([h.get("deal_queue_id") for h in hist]))
    check("history ordered ascending by created_at",
          [h["created_at"] for h in hist] == sorted(h["created_at"] for h in hist))
    check("no history row leaked to another deal",
          all(h["lender_name"] == FIXTURE_DEAL["lender_name"] for h in hist))

    section("Summary")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"{passed}/{total} checks passed")
    failed = [(n, d) for n, ok, d in results if not ok]
    if failed:
        print("\nFailures:")
        for n, d in failed:
            print(f"  - {n}: {d}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main_test())