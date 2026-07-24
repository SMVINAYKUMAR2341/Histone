# HistoNe — Gynecology Genetics-Referral Decision Support (PRD)

## Original problem statement
Point-of-care clinical decision support web app for gynecologists / OBs. For a
given patient scenario, tell the provider whether they need to refer to a
genetic counselor / genetics specialist, across six clinical pathways —
and if so, what type of referral and how urgently. Target interaction time
under 2 minutes. Every decision must cite its source guideline.

## User personas
- **Provider (gynecologist / OB)** — primary user, rushed, non-genetics specialist.
- **Nurse / medical assistant** — enters intake data.
- **Genetic counselor** — receives referrals with full context.
- **Admin** — manages criteria, views aggregate metrics, assigns roles.

## Six pathways (all in scope)
1. Hereditary cancer risk (BRCA1/2, Lynch, HBOC) — NCCN
2. Preconception carrier screening — ACOG
3. NIPT results interpretation — ACMG / ACOG
4. Abnormal ultrasound findings — ACOG
5. Infertility / recurrent pregnancy loss — ASRM
6. Positive family history of genetic disorder — ACMG / ACOG

## Core requirements (static)
- Deterministic rule engine with editable, versioned criteria (admin approval).
- Every decision cites its guideline source and shows matched criteria.
- Placeholder criteria clearly marked **NOT YET CLINICALLY VALIDATED**.
- Role-based access (provider / admin / nurse / genetic_counselor).
- Minimal patient data (initials + DOB + MRN), scoped per-provider.
- Downloadable PDF referral summary with reasoning.
- Aggregate, de-identified metrics for admin.
- Referrals tracker page with patient + reason + status workflow.

## Implemented (v1.0 — Feb 2026)
- Auth: Emergent-managed Google OAuth with role-based access; first login → admin; cookie + Bearer support.
- 6 pathways with structured forms + deterministic decision engine reading live DB criteria.
- 32 placeholder criteria seeded from ACOG / NCCN / ACMG / ASRM public summaries.
- Assessments: create/list/get + PDF export (reportlab).
- Plain-language explanations via Claude Sonnet 4.5 (best-effort layer on top of rules).
- Patients CRUD (minimal identifiers).
- Referrals tracker (patient + reason + status: pending / sent / completed / declined).
- Admin: criteria management (versioned edits, approve/active toggles), user role management, metrics dashboard (Recharts).
- HistoNe rebrand: magenta primary (#b9207a), cream logo, blush accents. Clinical urgency red/amber/green retained.
- Testing: 27/27 backend tests, 6/6 frontend flows pass (iteration_1).

## Implemented (v1.1 — Feb 2026)
- **Multigenerational pedigree editor** at `/patients/:id/pedigree` — structured form (4 grandparents / 2 parents / proband + variable siblings, children, aunts, uncles) with live SVG canvas visualization (male=square, female=circle, magenta fill=affected, X=deceased, "P" tag=proband).
- Pedigree-level toggles: Ashkenazi ancestry, consanguinity, ancestries list.
- Pedigree auto-derives features for ALL 6 pathways (family cancer counts, male breast in family, closest affected degree, multiple affected, ancestries). Defensive: Ashkenazi toggle auto-adds to ancestries so carrier-screening rules always fire.
- User input on the assessment form overrides derived features when explicitly set.
- `pedigree_used=true` flag on assessment doc; shown as badge on result screen.
- **Email referral PDFs directly to clinics** via Gmail SMTP + App Password (`GMAIL_ADDRESS` + `GMAIL_APP_PASSWORD` in `backend/.env`). Endpoint returns 503 with configuration hint when unset.
- Email dialog on result page with To / Cc / Subject / Note; auto-generates subject `[HistoNe · URGENT] Genetics referral — <pathway>`; sets `Reply-To` to referring provider.
- After a successful send, the assessment's referral_status auto-flips to `sent` and an entry is written to `email_log`.
- Testing: 40/40 backend + 5/5 frontend flows pass (iteration_2).

## Explicitly out of v1
- Patient-facing app / portal
- Live EHR / scheduling integration
- Payer eligibility
- Multi-language
- Native mobile

## Backlog (P1)
- Criterion editor: add/remove rules (currently edit-only)
- Guideline approval workflow with counselor signature
- Access log viewer / audit UI for admin
- Multi-generation pedigree tree input (v1 uses count-based fields)
- Email/fax the referral PDF directly to the counseling clinic
- Provider dashboard: my urgent referrals awaiting follow-up

## Backlog (P2)
- EHR (FHIR) integration
- Insurance / payer eligibility check
- Multi-language forms and PDFs
- Patient-facing summary/portal
- Push notifications for pending referrals
