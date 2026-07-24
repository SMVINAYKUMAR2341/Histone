"""Backend integration tests for HistoNe Gyn Genetics DSS."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0].rstrip("/")

PROVIDER_TOKEN = "test_session_provider_001"
ADMIN_TOKEN = "test_session_admin_001"


def h(token=None):
    return {"Authorization": f"Bearer {token}"} if token else {}


# ---------------- Auth ----------------
class TestAuth:
    def test_me_provider(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "provider"
        assert d["user_id"] == "user_provider_test_001"

    def test_me_admin(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=h("bogus_token_xxx"))
        assert r.status_code == 401


# ---------------- Pathways & Criteria ----------------
class TestPathwaysCriteria:
    def test_pathways(self):
        r = requests.get(f"{BASE_URL}/api/pathways", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 6
        for p in data:
            assert {"id", "name", "short", "description"}.issubset(p.keys())

    def test_pathways_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/pathways")
        assert r.status_code == 401

    def test_criteria_all(self):
        r = requests.get(f"{BASE_URL}/api/criteria", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 32
        c = data[0]
        for k in ("rule_key", "outcome", "referral_target", "guideline_source",
                  "citation", "active", "approved", "version"):
            assert k in c
        assert c["active"] is True
        assert c["approved"] is True
        assert c["version"] >= 1

    def test_criteria_filter(self):
        r = requests.get(f"{BASE_URL}/api/criteria?pathway_id=hereditary_cancer",
                         headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(c["pathway_id"] == "hereditary_cancer" for c in data)


# ---------------- Patients ----------------
class TestPatients:
    def test_create_and_list(self):
        payload = {"initials": "TT", "dob": "1990-01-01", "mrn": "TEST_MRN_001"}
        r = requests.post(f"{BASE_URL}/api/patients", json=payload, headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["initials"] == "TT" and p["mrn"] == "TEST_MRN_001"
        assert p["created_by"] == "user_provider_test_001"

        r2 = requests.get(f"{BASE_URL}/api/patients", headers=h(PROVIDER_TOKEN))
        assert r2.status_code == 200
        assert any(x["patient_id"] == p["patient_id"] for x in r2.json())


# ---------------- Assessments (decision engine) ----------------
class TestAssessments:
    def _post(self, pathway_id, input_data):
        payload = {"pathway_id": pathway_id, "input_data": input_data, "request_explanation": False}
        r = requests.post(f"{BASE_URL}/api/assessments", json=payload, headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200, r.text
        return r.json()

    def test_hereditary_cancer_urgent(self):
        d = self._post("hereditary_cancer",
                       {"personal_breast_cancer": True, "personal_breast_cancer_age": 42,
                        "ashkenazi_ancestry": True})
        assert d["outcome"] == "urgent"
        assert "Cancer genetic counselor" in d["referral_target"]
        assert any(m["rule_key"] == "hc_personal_breast_young" for m in d["matched_criteria"])

    def test_carrier_screening_routine(self):
        d = self._post("carrier_screening", {"consanguinity": True, "ancestries": ["ashkenazi"]})
        assert d["outcome"] == "routine"

    def test_nipt_urgent(self):
        d = self._post("nipt_results", {"result_type": "t21_positive"})
        assert d["outcome"] == "urgent"
        assert "MFM" in d["referral_target"]

    def test_ultrasound_borderline(self):
        d = self._post("abnormal_ultrasound", {"soft_markers": ["echogenic_bowel"]})
        assert d["outcome"] == "borderline"

    def test_rpl_urgent(self):
        d = self._post("infertility_rpl", {"pregnancy_loss_count": 3})
        assert d["outcome"] == "urgent"

    def test_family_history_urgent(self):
        d = self._post("family_history", {"closest_affected_degree": "first",
                                          "reproductive_planning": True})
        assert d["outcome"] == "urgent"

    def test_no_referral(self):
        d = self._post("hereditary_cancer", {"personal_breast_cancer": False})
        assert d["outcome"] == "no_referral"
        assert d["matched_criteria"] == []

    def test_list_own_only(self):
        r = requests.get(f"{BASE_URL}/api/assessments", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        docs = r.json()
        assert all(x["provider_user_id"] == "user_provider_test_001" for x in docs)

    def test_pdf_download(self):
        d = self._post("nipt_results", {"result_type": "t18_positive"})
        aid = d["assessment_id"]
        r = requests.get(f"{BASE_URL}/api/assessments/{aid}/pdf", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        assert "application/pdf" in r.headers.get("content-type", "")
        assert len(r.content) > 1024


# ---------------- Referrals ----------------
class TestReferrals:
    def test_referrals_and_status(self):
        # ensure at least one referral
        payload = {"pathway_id": "family_history",
                   "input_data": {"closest_affected_degree": "first", "reproductive_planning": True},
                   "request_explanation": False}
        r = requests.post(f"{BASE_URL}/api/assessments", json=payload, headers=h(PROVIDER_TOKEN))
        aid = r.json()["assessment_id"]

        r = requests.get(f"{BASE_URL}/api/referrals", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        for it in items:
            assert it["outcome"] != "no_referral"
            for k in ("assessment_id", "pathway_id", "outcome", "reason",
                      "matched_criteria_count", "patient_name", "patient_mrn",
                      "status", "referral_target", "created_at"):
                assert k in it, f"missing {k}"
        # PATCH status
        r2 = requests.patch(f"{BASE_URL}/api/referrals/{aid}/status",
                            json={"status": "sent"}, headers=h(PROVIDER_TOKEN))
        assert r2.status_code == 200
        # verify
        r3 = requests.get(f"{BASE_URL}/api/referrals", headers=h(PROVIDER_TOKEN))
        target = [x for x in r3.json() if x["assessment_id"] == aid][0]
        assert target["status"] == "sent"


# ---------------- Admin criteria edit ----------------
class TestAdminCriteria:
    def test_non_admin_403(self):
        r = requests.get(f"{BASE_URL}/api/criteria?pathway_id=hereditary_cancer",
                         headers=h(PROVIDER_TOKEN))
        cid = r.json()[0]["criterion_id"]
        r2 = requests.patch(f"{BASE_URL}/api/criteria/{cid}", json={"threshold": 55},
                            headers=h(PROVIDER_TOKEN))
        assert r2.status_code == 403

    def test_admin_patch_increments_version(self):
        r = requests.get(f"{BASE_URL}/api/criteria?pathway_id=hereditary_cancer",
                         headers=h(ADMIN_TOKEN))
        c = [x for x in r.json() if x["rule_key"] == "hc_personal_breast_young"][0]
        old_v = c["version"]
        r2 = requests.patch(f"{BASE_URL}/api/criteria/{c['criterion_id']}",
                            json={"threshold": 55}, headers=h(ADMIN_TOKEN))
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["threshold"] == 55
        assert d["version"] == old_v + 1
        # revert
        requests.patch(f"{BASE_URL}/api/criteria/{c['criterion_id']}",
                       json={"threshold": 50}, headers=h(ADMIN_TOKEN))

    def test_live_criteria_read_by_engine(self):
        """Deactivate hc_personal_breast_young then confirm not matched."""
        r = requests.get(f"{BASE_URL}/api/criteria?pathway_id=hereditary_cancer",
                         headers=h(ADMIN_TOKEN))
        c = [x for x in r.json() if x["rule_key"] == "hc_personal_breast_young"][0]
        cid = c["criterion_id"]
        try:
            r2 = requests.patch(f"{BASE_URL}/api/criteria/{cid}",
                                json={"active": False}, headers=h(ADMIN_TOKEN))
            assert r2.status_code == 200
            payload = {"pathway_id": "hereditary_cancer",
                       "input_data": {"personal_breast_cancer": True,
                                      "personal_breast_cancer_age": 42},
                       "request_explanation": False}
            r3 = requests.post(f"{BASE_URL}/api/assessments", json=payload,
                               headers=h(PROVIDER_TOKEN))
            assert r3.status_code == 200
            matched_keys = [m["rule_key"] for m in r3.json()["matched_criteria"]]
            assert "hc_personal_breast_young" not in matched_keys
        finally:
            requests.patch(f"{BASE_URL}/api/criteria/{cid}",
                           json={"active": True}, headers=h(ADMIN_TOKEN))


# ---------------- Metrics & Admin users ----------------
class TestAdminEndpoints:
    def test_metrics_admin(self):
        r = requests.get(f"{BASE_URL}/api/metrics/summary", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        d = r.json()
        for k in ("totals", "by_pathway", "trend_14d"):
            assert k in d

    def test_metrics_non_admin_403(self):
        r = requests.get(f"{BASE_URL}/api/metrics/summary", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 403

    def test_admin_users_list(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_admin_users_non_admin_403(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=h(PROVIDER_TOKEN))
        assert r.status_code == 403

    def test_admin_update_role(self):
        # Create a temp-ish test user via mongo directly is complex; toggle provider user
        r = requests.patch(f"{BASE_URL}/api/admin/users/user_provider_test_001",
                           json={"role": "nurse"}, headers=h(ADMIN_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "nurse"
        # revert
        r2 = requests.patch(f"{BASE_URL}/api/admin/users/user_provider_test_001",
                            json={"role": "provider"}, headers=h(ADMIN_TOKEN))
        assert r2.status_code == 200
        assert r2.json()["role"] == "provider"
