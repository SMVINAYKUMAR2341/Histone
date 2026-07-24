"""
Deterministic clinical decision engine.
Each pathway has an evaluator that takes structured input + active/approved
criteria documents (from DB) and returns a decision.
Result urgencies: 'no_referral' < 'borderline' < 'routine' < 'urgent'
"""
from typing import Dict, List, Any

URGENCY_RANK = {"no_referral": 0, "borderline": 1, "routine": 2, "urgent": 3}


def _pick_highest(matches: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not matches:
        return {
            "outcome": "no_referral",
            "referral_target": "None",
            "matched_criteria": [],
        }
    matches.sort(key=lambda m: URGENCY_RANK.get(m["outcome"], 0), reverse=True)
    top = matches[0]
    return {
        "outcome": top["outcome"],
        "referral_target": top["referral_target"],
        "matched_criteria": matches,
    }


def _fires(active_criteria: List[dict], rule_key: str):
    for c in active_criteria:
        if c.get("rule_key") == rule_key and c.get("active") and c.get("approved"):
            return c
    return None


def _match(c: dict) -> dict:
    return {
        "rule_key": c["rule_key"],
        "label": c["label"],
        "outcome": c["outcome"],
        "referral_target": c["referral_target"],
        "guideline_source": c["guideline_source"],
        "citation": c["citation"],
    }


def evaluate_hereditary_cancer(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    # Personal breast cancer young
    if d.get("personal_breast_cancer") and (d.get("personal_breast_cancer_age") or 999) <= (
        _fires(criteria, "hc_personal_breast_young") or {}
    ).get("threshold", 50):
        c = _fires(criteria, "hc_personal_breast_young")
        if c:
            matches.append(_match(c))
    # Ovarian cancer any age (self or first-degree)
    if d.get("personal_ovarian_cancer") or d.get("family_ovarian_cancer_count", 0) >= 1:
        c = _fires(criteria, "hc_ovarian_any_age")
        if c:
            matches.append(_match(c))
    # 2+ first-degree relatives with breast cancer
    if d.get("family_breast_cancer_first_degree_count", 0) >= (
        _fires(criteria, "hc_two_plus_first_degree_breast") or {}
    ).get("threshold", 2):
        c = _fires(criteria, "hc_two_plus_first_degree_breast")
        if c:
            matches.append(_match(c))
    # Ashkenazi Jewish + any breast/ovarian
    if d.get("ashkenazi_ancestry") and (
        d.get("personal_breast_cancer")
        or d.get("personal_ovarian_cancer")
        or d.get("family_breast_cancer_first_degree_count", 0) >= 1
        or d.get("family_ovarian_cancer_count", 0) >= 1
    ):
        c = _fires(criteria, "hc_ashkenazi_breast_ovarian")
        if c:
            matches.append(_match(c))
    # Male breast cancer in family
    if d.get("male_breast_cancer_family"):
        c = _fires(criteria, "hc_male_breast_family")
        if c:
            matches.append(_match(c))
    # Lynch: 3+ colon cancers or endometrial + colon
    if d.get("family_colon_cancer_count", 0) >= (
        _fires(criteria, "hc_lynch_three_colon") or {}
    ).get("threshold", 3):
        c = _fires(criteria, "hc_lynch_three_colon")
        if c:
            matches.append(_match(c))
    if d.get("personal_endometrial_cancer") and d.get("family_colon_cancer_count", 0) >= 1:
        c = _fires(criteria, "hc_lynch_endometrial_colon")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


def evaluate_carrier_screening(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    if d.get("consanguinity"):
        c = _fires(criteria, "cs_consanguinity")
        if c:
            matches.append(_match(c))
    if d.get("both_partners_same_carrier"):
        c = _fires(criteria, "cs_both_partners_carrier")
        if c:
            matches.append(_match(c))
    if d.get("one_partner_carrier"):
        c = _fires(criteria, "cs_one_partner_carrier")
        if c:
            matches.append(_match(c))
    ancestries = d.get("ancestries", []) or []
    if "ashkenazi" in ancestries:
        c = _fires(criteria, "cs_ashkenazi")
        if c:
            matches.append(_match(c))
    if any(a in ancestries for a in ["mediterranean", "southeast_asian", "african"]):
        c = _fires(criteria, "cs_thalassemia_ancestry")
        if c:
            matches.append(_match(c))
    if d.get("family_history_recessive_condition"):
        c = _fires(criteria, "cs_family_recessive")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


def evaluate_nipt(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    result = d.get("result_type")
    if result in ("t21_positive", "t18_positive", "t13_positive"):
        c = _fires(criteria, "nipt_common_aneuploidy_positive")
        if c:
            matches.append(_match(c))
    if result == "sex_chromosome_positive":
        c = _fires(criteria, "nipt_sex_chromosome_positive")
        if c:
            matches.append(_match(c))
    if result == "microdeletion_positive":
        c = _fires(criteria, "nipt_microdeletion_positive")
        if c:
            matches.append(_match(c))
    if d.get("no_call") or (d.get("fetal_fraction") is not None and d["fetal_fraction"] < (
        _fires(criteria, "nipt_low_fetal_fraction") or {}
    ).get("threshold", 4.0)):
        c = _fires(criteria, "nipt_low_fetal_fraction")
        if c:
            matches.append(_match(c))
    if d.get("discordant_with_ultrasound"):
        c = _fires(criteria, "nipt_discordant")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


def evaluate_ultrasound(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    if d.get("structural_anomaly"):
        c = _fires(criteria, "us_structural_anomaly")
        if c:
            matches.append(_match(c))
    nt = d.get("nuchal_translucency_mm")
    if nt is not None and nt >= (
        _fires(criteria, "us_increased_nt") or {}
    ).get("threshold", 3.5):
        c = _fires(criteria, "us_increased_nt")
        if c:
            matches.append(_match(c))
    soft_count = len(d.get("soft_markers", []) or [])
    if soft_count >= (
        _fires(criteria, "us_multiple_soft_markers") or {}
    ).get("threshold", 2):
        c = _fires(criteria, "us_multiple_soft_markers")
        if c:
            matches.append(_match(c))
    elif soft_count == 1:
        c = _fires(criteria, "us_isolated_soft_marker")
        if c:
            matches.append(_match(c))
    if d.get("iugr_early_severe"):
        c = _fires(criteria, "us_iugr_early_severe")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


def evaluate_infertility_rpl(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    losses = d.get("pregnancy_loss_count", 0)
    thr_urgent = (_fires(criteria, "rpl_three_or_more_losses") or {}).get("threshold", 3)
    thr_routine = (_fires(criteria, "rpl_two_losses") or {}).get("threshold", 2)
    if losses >= thr_urgent:
        c = _fires(criteria, "rpl_three_or_more_losses")
        if c:
            matches.append(_match(c))
    elif losses >= thr_routine:
        c = _fires(criteria, "rpl_two_losses")
        if c:
            matches.append(_match(c))
    if d.get("parental_karyotype_abnormal"):
        c = _fires(criteria, "rpl_parental_karyotype_abnormal")
        if c:
            matches.append(_match(c))
    if d.get("azoospermia_or_severe_oligo"):
        c = _fires(criteria, "rpl_azoospermia")
        if c:
            matches.append(_match(c))
    if d.get("primary_ovarian_insufficiency"):
        c = _fires(criteria, "rpl_poi")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


def evaluate_family_history(input_data: dict, criteria: List[dict]) -> dict:
    matches = []
    d = input_data
    degree = d.get("closest_affected_degree")  # "first", "second", "third"
    planning = d.get("reproductive_planning", False)
    if degree == "first" and planning:
        c = _fires(criteria, "fh_first_degree_reproductive_planning")
        if c:
            matches.append(_match(c))
    if degree == "first":
        c = _fires(criteria, "fh_first_degree")
        if c:
            matches.append(_match(c))
    if degree in ("second",) and d.get("multiple_affected", False):
        c = _fires(criteria, "fh_second_degree_multiple")
        if c:
            matches.append(_match(c))
    if d.get("condition_severity") == "severe" and degree in ("first", "second"):
        c = _fires(criteria, "fh_severe_condition")
        if c:
            matches.append(_match(c))
    return _pick_highest(matches)


PATHWAY_EVALUATORS = {
    "hereditary_cancer": evaluate_hereditary_cancer,
    "carrier_screening": evaluate_carrier_screening,
    "nipt_results": evaluate_nipt,
    "abnormal_ultrasound": evaluate_ultrasound,
    "infertility_rpl": evaluate_infertility_rpl,
    "family_history": evaluate_family_history,
}


def evaluate(pathway_id: str, input_data: dict, criteria: List[dict]) -> dict:
    fn = PATHWAY_EVALUATORS.get(pathway_id)
    if not fn:
        return {"outcome": "no_referral", "referral_target": "None", "matched_criteria": []}
    return fn(input_data, criteria)
