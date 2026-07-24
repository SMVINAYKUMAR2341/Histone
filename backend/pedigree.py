"""
Pedigree feature derivation — converts a stored pedigree into the flat
input features the deterministic decision engine understands.
"""
from typing import Dict, List, Any


FIRST_DEGREE = {"father", "mother", "sibling", "child"}
SECOND_DEGREE = {
    "paternal_grandfather", "paternal_grandmother",
    "maternal_grandfather", "maternal_grandmother",
    "paternal_uncle_aunt", "maternal_uncle_aunt",
    "half_sibling",
}


def _has_condition(member: dict, condition: str) -> bool:
    return bool(member.get("affected")) and condition in (member.get("conditions") or [])


def derive_features(pedigree: dict | None) -> Dict[str, Any]:
    """From a pedigree document, derive the counts/flags used by the engine.

    Returned keys mirror the input_data keys expected by decision_engine.py so
    they can be merged into a scenario input as defaults (user-entered values
    take precedence at merge time).
    """
    if not pedigree:
        return {}
    members: List[dict] = pedigree.get("members") or []
    non_proband = [m for m in members if (m.get("relation") != "proband")]
    first_degree = [m for m in members if (m.get("relation") in FIRST_DEGREE)]
    second_degree = [m for m in members if (m.get("relation") in SECOND_DEGREE)]

    breast_first = sum(1 for m in first_degree if _has_condition(m, "breast_cancer"))
    ovarian_any = sum(1 for m in non_proband if _has_condition(m, "ovarian_cancer"))
    colon_any = sum(1 for m in non_proband if _has_condition(m, "colorectal_cancer"))
    male_breast = any(
        m.get("sex") == "M" and _has_condition(m, "breast_cancer") for m in non_proband
    )
    family_recessive = any(_has_condition(m, "recessive_condition") for m in non_proband)

    first_degree_affected = [m for m in first_degree if m.get("affected")]
    second_degree_affected = [m for m in second_degree if m.get("affected")]
    total_affected = sum(1 for m in non_proband if m.get("affected"))

    if first_degree_affected:
        closest = "first"
    elif second_degree_affected:
        closest = "second"
    else:
        closest = None

    out: Dict[str, Any] = {
        # Hereditary cancer
        "family_breast_cancer_first_degree_count": breast_first,
        "family_ovarian_cancer_count": ovarian_any,
        "family_colon_cancer_count": colon_any,
        "male_breast_cancer_family": male_breast,
        # Carrier screening
        "ashkenazi_ancestry": bool(pedigree.get("ashkenazi_ancestry")),
        "consanguinity": bool(pedigree.get("consanguinity")),
        "ancestries": list(pedigree.get("ancestries") or []),
        "family_history_recessive_condition": family_recessive,
        # Family history pathway
        "multiple_affected": total_affected >= 2,
    }
    # Defensive: if pedigree-level ashkenazi_ancestry toggle is on but the
    # ancestries list doesn't include 'ashkenazi', add it so carrier-screening
    # rules that read the ancestries list still fire.
    if out["ashkenazi_ancestry"] and "ashkenazi" not in out["ancestries"]:
        out["ancestries"] = [*out["ancestries"], "ashkenazi"]
    if closest:
        out["closest_affected_degree"] = closest
    return out


def merge_with_input(derived: dict, user_input: dict) -> dict:
    """User-entered values override derived ones only when explicitly set.

    A value is considered 'explicitly set' when it is not None and not an
    empty string. Booleans (True/False) always win. Empty lists from user
    are treated as 'not set' so derived list values shine through.
    """
    merged = dict(derived)
    for k, v in (user_input or {}).items():
        if v is None:
            continue
        if isinstance(v, str) and v == "":
            continue
        if isinstance(v, list) and len(v) == 0:
            continue
        merged[k] = v
    return merged
