"""Iteration 2 tests: pedigree endpoints, pedigree-driven assessments, email config."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
    open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split()[0].rstrip("/")

PROVIDER = "test_session_provider_001"
ADMIN = "test_session_admin_001"


def h(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def provider_patient():
    """Create a fresh patient owned by the provider."""
    payload = {"initials": "PD", "dob": "1985-03-14", "mrn": f"TEST_PED_{uuid.uuid4().hex[:6]}"}
    r = requests.post(f"{BASE_URL}/api/patients", json=payload, headers=h(PROVIDER))
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Pedigree endpoints ----------
class TestPedigreeEndpoints:
    def test_empty_scaffold(self, provider_patient):
        pid = provider_patient["patient_id"]
        r = requests.get(f"{BASE_URL}/api/patients/{pid}/pedigree", headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        assert d["patient_id"] == pid
        assert d["ashkenazi_ancestry"] is False
        assert d["consanguinity"] is False
        assert d["ancestries"] == []
        assert d["members"] == []

    def test_upsert_owner(self, provider_patient):
        pid = provider_patient["patient_id"]
        body = {
            "ashkenazi_ancestry": True,
            "consanguinity": False,
            "ancestries": ["ashkenazi"],
            "members": [
                {"id": "mother", "relation": "mother", "sex": "F", "affected": True,
                 "conditions": ["breast_cancer"], "age_at_diagnosis": 48},
                {"id": "sib_1", "relation": "sibling", "sex": "F", "affected": True,
                 "conditions": ["breast_cancer"], "age_at_diagnosis": 45},
                {"id": "proband", "relation": "proband", "sex": "F", "affected": False, "conditions": []},
            ],
        }
        r = requests.put(f"{BASE_URL}/api/patients/{pid}/pedigree", json=body, headers=h(PROVIDER))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ashkenazi_ancestry"] is True
        assert len(d["members"]) == 3
        # GET verifies persistence
        r2 = requests.get(f"{BASE_URL}/api/patients/{pid}/pedigree", headers=h(PROVIDER))
        assert r2.status_code == 200
        assert len(r2.json()["members"]) == 3

    def test_admin_can_save_any(self, provider_patient):
        pid = provider_patient["patient_id"]
        r = requests.put(f"{BASE_URL}/api/patients/{pid}/pedigree",
                         json={"ashkenazi_ancestry": True, "consanguinity": False,
                               "ancestries": ["ashkenazi"], "members": [
                                   {"id": "mother", "relation": "mother", "sex": "F", "affected": True,
                                    "conditions": ["breast_cancer"], "age_at_diagnosis": 48},
                                   {"id": "sib_1", "relation": "sibling", "sex": "F", "affected": True,
                                    "conditions": ["breast_cancer"], "age_at_diagnosis": 45},
                                   {"id": "proband", "relation": "proband", "sex": "F"},
                               ]},
                         headers=h(ADMIN))
        assert r.status_code == 200

    def test_non_owner_forbidden(self):
        """Admin creates a patient; provider tries to save pedigree -> 403."""
        r = requests.post(f"{BASE_URL}/api/patients",
                         json={"initials": "AD", "dob": "1970-01-01",
                               "mrn": f"TEST_ADM_{uuid.uuid4().hex[:6]}"},
                         headers=h(ADMIN))
        assert r.status_code == 200
        admin_pid = r.json()["patient_id"]
        r2 = requests.put(f"{BASE_URL}/api/patients/{admin_pid}/pedigree",
                          json={"ashkenazi_ancestry": False, "consanguinity": False,
                                "ancestries": [], "members": []},
                          headers=h(PROVIDER))
        assert r2.status_code == 403

    def test_404_missing_patient(self):
        r = requests.put(f"{BASE_URL}/api/patients/pat_does_not_exist/pedigree",
                         json={"ashkenazi_ancestry": False, "consanguinity": False,
                               "ancestries": [], "members": []},
                         headers=h(PROVIDER))
        assert r.status_code == 404


# ---------- Pedigree-driven assessments ----------
class TestPedigreeAssessments:
    def _ensure_ped(self, pid, members, ash=False):
        body = {"ashkenazi_ancestry": ash, "consanguinity": False, "ancestries": [],
                "members": members}
        r = requests.put(f"{BASE_URL}/api/patients/{pid}/pedigree", json=body, headers=h(PROVIDER))
        assert r.status_code == 200

    def test_hc_derives_breast_and_ashkenazi(self, provider_patient):
        pid = provider_patient["patient_id"]
        self._ensure_ped(pid, [
            {"id": "mother", "relation": "mother", "sex": "F", "affected": True,
             "conditions": ["breast_cancer"], "age_at_diagnosis": 48},
            {"id": "sib_1", "relation": "sibling", "sex": "F", "affected": True,
             "conditions": ["breast_cancer"], "age_at_diagnosis": 45},
            {"id": "proband", "relation": "proband", "sex": "F"},
        ], ash=True)
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "hereditary_cancer", "patient_id": pid,
                                "input_data": {}, "request_explanation": False},
                          headers=h(PROVIDER))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["pedigree_used"] is True
        assert d["input_data"]["family_breast_cancer_first_degree_count"] == 2
        matched = {m["rule_key"] for m in d["matched_criteria"]}
        assert "hc_two_plus_first_degree_breast" in matched
        assert "hc_ashkenazi_breast_ovarian" in matched
        assert d["outcome"] in ("routine", "urgent")

    def test_user_input_override(self, provider_patient):
        pid = provider_patient["patient_id"]
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "hereditary_cancer", "patient_id": pid,
                                "input_data": {"family_breast_cancer_first_degree_count": 5},
                                "request_explanation": False},
                          headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        assert d["input_data"]["family_breast_cancer_first_degree_count"] == 5

    def test_family_history_first_degree(self, provider_patient):
        pid = provider_patient["patient_id"]
        # routine
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "family_history", "patient_id": pid,
                                "input_data": {}, "request_explanation": False},
                          headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        matched = {m["rule_key"] for m in d["matched_criteria"]}
        assert "fh_first_degree" in matched
        assert d["outcome"] == "routine"
        # escalates to urgent with reproductive_planning=true
        r2 = requests.post(f"{BASE_URL}/api/assessments",
                           json={"pathway_id": "family_history", "patient_id": pid,
                                 "input_data": {"reproductive_planning": True},
                                 "request_explanation": False},
                           headers=h(PROVIDER))
        assert r2.status_code == 200
        assert r2.json()["outcome"] == "urgent"

    def test_carrier_screening_ashkenazi(self, provider_patient):
        pid = provider_patient["patient_id"]
        # Set ancestries=["ashkenazi"] explicitly since derive_features doesn't
        # auto-inject "ashkenazi" into the ancestries list when ashkenazi_ancestry=True.
        self._ensure_ped(pid, [
            {"id": "proband", "relation": "proband", "sex": "F"},
        ], ash=True)
        # add ancestries via PUT
        requests.put(f"{BASE_URL}/api/patients/{pid}/pedigree",
                     json={"ashkenazi_ancestry": True, "consanguinity": False,
                           "ancestries": ["ashkenazi"],
                           "members": [{"id": "proband", "relation": "proband", "sex": "F"}]},
                     headers=h(PROVIDER))
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "carrier_screening", "patient_id": pid,
                                "input_data": {}, "request_explanation": False},
                          headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        matched = {m["rule_key"] for m in d["matched_criteria"]}
        assert "cs_ashkenazi" in matched
        assert d["outcome"] == "routine"

    def test_male_breast_cancer_family(self, provider_patient):
        pid = provider_patient["patient_id"]
        self._ensure_ped(pid, [
            {"id": "pau_1", "relation": "paternal_uncle_aunt", "sex": "M", "affected": True,
             "conditions": ["breast_cancer"], "age_at_diagnosis": 55},
            {"id": "proband", "relation": "proband", "sex": "F"},
        ], ash=False)
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "hereditary_cancer", "patient_id": pid,
                                "input_data": {}, "request_explanation": False},
                          headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        matched = {m["rule_key"] for m in d["matched_criteria"]}
        assert "hc_male_breast_family" in matched
        assert d["outcome"] == "urgent"


# ---------- Email endpoints ----------
class TestEmail:
    def test_status_not_configured(self):
        r = requests.get(f"{BASE_URL}/api/email/status", headers=h(PROVIDER))
        assert r.status_code == 200
        d = r.json()
        assert d["configured"] is False
        assert d["from"] == ""

    def test_email_503_when_unconfigured(self):
        # Create an assessment first
        r = requests.post(f"{BASE_URL}/api/assessments",
                          json={"pathway_id": "hereditary_cancer",
                                "input_data": {"personal_breast_cancer": True,
                                               "personal_breast_cancer_age": 40},
                                "request_explanation": False},
                          headers=h(PROVIDER))
        aid = r.json()["assessment_id"]
        r2 = requests.post(f"{BASE_URL}/api/assessments/{aid}/email",
                           json={"to": "test@example.com"}, headers=h(PROVIDER))
        assert r2.status_code == 503
        assert "GMAIL_ADDRESS" in r2.json().get("detail", "")


# ---------- Regression: standalone assessments still work ----------
class TestRegression:
    def test_standalone_no_patient(self):
        # All 6 pathways run without patient_id (no pedigree_used)
        cases = [
            ("hereditary_cancer", {"personal_breast_cancer": True, "personal_breast_cancer_age": 42}, "urgent"),
            ("carrier_screening", {"consanguinity": True, "ancestries": ["ashkenazi"]}, "routine"),
            ("nipt_results", {"result_type": "t21_positive"}, "urgent"),
            ("abnormal_ultrasound", {"soft_markers": ["echogenic_bowel"]}, "borderline"),
            ("infertility_rpl", {"pregnancy_loss_count": 3}, "urgent"),
            ("family_history", {"closest_affected_degree": "first", "reproductive_planning": True}, "urgent"),
        ]
        for pathway, inp, expected in cases:
            r = requests.post(f"{BASE_URL}/api/assessments",
                              json={"pathway_id": pathway, "input_data": inp,
                                    "request_explanation": False},
                              headers=h(PROVIDER))
            assert r.status_code == 200, f"{pathway}: {r.text}"
            d = r.json()
            assert d["outcome"] == expected, f"{pathway}: expected {expected} got {d['outcome']}"
            assert d.get("pedigree_used") is False
