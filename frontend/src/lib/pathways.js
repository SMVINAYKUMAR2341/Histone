// Pathway definitions with form schemas.
// Each field type maps to a component in the PathwayForm renderer.

import {
  Dna, Users, Baby, Waves, Activity, GitBranch,
} from "lucide-react";

export const PATHWAY_ICONS = {
  hereditary_cancer: Dna,
  carrier_screening: Users,
  nipt_results: Activity,
  abnormal_ultrasound: Waves,
  infertility_rpl: Baby,
  family_history: GitBranch,
};

export const PATHWAY_FORMS = {
  hereditary_cancer: {
    title: "Hereditary cancer risk",
    fields: [
      { key: "personal_breast_cancer", label: "Personal history of breast cancer", type: "bool" },
      { key: "personal_breast_cancer_age", label: "Age at breast cancer diagnosis (if any)", type: "number", showIf: (v) => v.personal_breast_cancer },
      { key: "personal_ovarian_cancer", label: "Personal ovarian / fallopian / peritoneal cancer", type: "bool" },
      { key: "personal_endometrial_cancer", label: "Personal endometrial cancer", type: "bool" },
      { key: "family_breast_cancer_first_degree_count", label: "First-degree relatives with breast cancer", type: "number", min: 0, default: 0 },
      { key: "family_ovarian_cancer_count", label: "Relatives (any degree) with ovarian cancer", type: "number", min: 0, default: 0 },
      { key: "family_colon_cancer_count", label: "Relatives with colorectal cancer", type: "number", min: 0, default: 0 },
      { key: "male_breast_cancer_family", label: "Male breast cancer in family", type: "bool" },
      { key: "ashkenazi_ancestry", label: "Ashkenazi Jewish ancestry", type: "bool" },
    ],
  },
  carrier_screening: {
    title: "Preconception carrier screening",
    fields: [
      { key: "consanguinity", label: "Consanguineous partnership", type: "bool" },
      { key: "both_partners_same_carrier", label: "Both partners known carriers of same recessive condition", type: "bool" },
      { key: "one_partner_carrier", label: "One partner is a known carrier", type: "bool" },
      { key: "family_history_recessive_condition", label: "Family history of a recessive genetic condition", type: "bool" },
      {
        key: "ancestries", label: "Reported ancestries", type: "multi",
        options: [
          { value: "ashkenazi", label: "Ashkenazi Jewish" },
          { value: "mediterranean", label: "Mediterranean" },
          { value: "southeast_asian", label: "Southeast Asian" },
          { value: "african", label: "African / African-American" },
          { value: "european", label: "European (non-AJ)" },
          { value: "latino", label: "Latino / Hispanic" },
          { value: "other", label: "Other" },
        ],
      },
    ],
  },
  nipt_results: {
    title: "NIPT results",
    fields: [
      {
        key: "result_type", label: "Result type", type: "select",
        options: [
          { value: "negative", label: "Negative / low-risk" },
          { value: "t21_positive", label: "Screen positive — Trisomy 21" },
          { value: "t18_positive", label: "Screen positive — Trisomy 18" },
          { value: "t13_positive", label: "Screen positive — Trisomy 13" },
          { value: "sex_chromosome_positive", label: "Screen positive — sex chromosome" },
          { value: "microdeletion_positive", label: "Screen positive — microdeletion" },
          { value: "no_call", label: "No-call / uninformative" },
        ],
      },
      { key: "fetal_fraction", label: "Fetal fraction (%)", type: "number", step: 0.1 },
      { key: "no_call", label: "Result was flagged as no-call", type: "bool" },
      { key: "discordant_with_ultrasound", label: "Discordant with ultrasound findings", type: "bool" },
      { key: "gestational_age_weeks", label: "Gestational age (weeks)", type: "number", step: 0.1 },
    ],
  },
  abnormal_ultrasound: {
    title: "Abnormal ultrasound findings",
    fields: [
      { key: "gestational_age_weeks", label: "Gestational age (weeks)", type: "number", step: 0.1 },
      { key: "nuchal_translucency_mm", label: "Nuchal translucency (mm)", type: "number", step: 0.1 },
      { key: "structural_anomaly", label: "Major structural anomaly identified", type: "bool" },
      { key: "iugr_early_severe", label: "Early-onset severe IUGR (< 32w)", type: "bool" },
      {
        key: "soft_markers", label: "Soft markers present", type: "multi",
        options: [
          { value: "echogenic_bowel", label: "Echogenic bowel" },
          { value: "echogenic_intracardiac_focus", label: "Echogenic intracardiac focus" },
          { value: "choroid_plexus_cyst", label: "Choroid plexus cyst" },
          { value: "short_femur", label: "Short femur" },
          { value: "short_humerus", label: "Short humerus" },
          { value: "pyelectasis", label: "Pyelectasis" },
          { value: "thickened_nuchal_fold", label: "Thickened nuchal fold" },
        ],
      },
    ],
  },
  infertility_rpl: {
    title: "Infertility / recurrent pregnancy loss",
    fields: [
      { key: "pregnancy_loss_count", label: "Number of clinically recognized losses", type: "number", min: 0, default: 0 },
      { key: "parental_karyotype_abnormal", label: "Known parental karyotype abnormality", type: "bool" },
      { key: "azoospermia_or_severe_oligo", label: "Male factor: azoospermia or severe oligospermia", type: "bool" },
      { key: "primary_ovarian_insufficiency", label: "Primary ovarian insufficiency (< 40y)", type: "bool" },
    ],
  },
  family_history: {
    title: "Positive family history of a genetic disorder",
    fields: [
      { key: "condition_name", label: "Condition name (free text — for the record)", type: "text" },
      {
        key: "closest_affected_degree", label: "Closest affected relative", type: "select",
        options: [
          { value: "first", label: "First-degree (parent/sibling/child)" },
          { value: "second", label: "Second-degree" },
          { value: "third", label: "Third-degree or more distant" },
        ],
      },
      { key: "multiple_affected", label: "Multiple affected relatives", type: "bool" },
      { key: "reproductive_planning", label: "Patient is planning pregnancy or currently pregnant", type: "bool" },
      {
        key: "condition_severity", label: "Condition severity", type: "select",
        options: [
          { value: "mild", label: "Mild" },
          { value: "moderate", label: "Moderate" },
          { value: "severe", label: "Severe / life-limiting" },
          { value: "unknown", label: "Unknown" },
        ],
      },
    ],
  },
};
