"""
Gynecology Genetics-Referral Decision Support — FastAPI backend.
Auth: Emergent-managed Google OAuth (session_token cookie or Bearer header).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Cookie, Header, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid, logging, io, asyncio, httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict, Literal
from datetime import datetime, timezone, timedelta

from decision_engine import evaluate as evaluate_pathway
from seed_criteria import SEED_CRITERIA, PATHWAY_META
from pdf_gen import generate_referral_pdf

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="Gyn Genetics Referral DSS")
api = APIRouter(prefix="/api")

logger = logging.getLogger("gyn-dss")
logging.basicConfig(level=logging.INFO)


# ---------------- Models ----------------
def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""
    role: Literal["provider", "admin", "nurse", "genetic_counselor"] = "provider"
    created_at: Any = Field(default_factory=now_utc)


class Patient(BaseModel):
    patient_id: str
    initials: str
    dob: str  # YYYY-MM-DD
    mrn: str
    created_by: str
    created_at: str = Field(default_factory=now_utc)


class Criterion(BaseModel):
    criterion_id: str
    pathway_id: str
    rule_key: str
    label: str
    description: str
    threshold: Optional[float] = None
    outcome: str
    referral_target: str
    guideline_source: str
    citation: str
    active: bool = True
    approved: bool = True
    version: int = 1
    updated_at: str = Field(default_factory=now_utc)


class Assessment(BaseModel):
    assessment_id: str
    pathway_id: str
    patient_id: Optional[str] = None
    provider_user_id: str
    input_data: Dict[str, Any]
    outcome: str
    referral_target: str
    matched_criteria: List[Dict[str, Any]]
    explanation: Optional[str] = None
    created_at: str = Field(default_factory=now_utc)


# ---------------- Auth helpers ----------------
async def _resolve_session_token(request: Request) -> Optional[str]:
    tok = request.cookies.get("session_token")
    if tok:
        return tok
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(request: Request) -> User:
    token = await _resolve_session_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


# ---------------- Startup seeding ----------------
@app.on_event("startup")
async def seed():
    count = await db.criteria.count_documents({})
    if count == 0:
        docs = []
        for c in SEED_CRITERIA:
            docs.append({
                "criterion_id": f"crit_{uuid.uuid4().hex[:12]}",
                **c,
                "active": True,
                "approved": True,
                "version": 1,
                "updated_at": now_utc(),
            })
        if docs:
            await db.criteria.insert_many(docs)
        logger.info("Seeded %d criteria", len(docs))
    # Ensure at least one admin bootstrap flag exists
    if not await db.system_flags.find_one({"key": "bootstrap"}):
        await db.system_flags.insert_one({"key": "bootstrap", "admin_created": False})


# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"service": "gyn-genetics-referral-dss", "status": "ok"}


# ---------------- Auth endpoints ----------------
class SessionExchangeIn(BaseModel):
    session_id: str


@api.post("/auth/session")
async def auth_session(payload: SessionExchangeIn, response: Response):
    """Exchange session_id (from Emergent OAuth URL fragment) for a session_token."""
    async with httpx.AsyncClient(timeout=15) as httpc:
        r = await httpc.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="OAuth session invalid")
    data = r.json()
    email = data["email"]
    session_token = data["session_token"]

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        role = existing.get("role", "provider")
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture", "")}},
        )
    else:
        # Bootstrap: first user becomes admin
        flag = await db.system_flags.find_one({"key": "bootstrap"})
        is_first = not (flag and flag.get("admin_created"))
        role = "admin" if is_first else "provider"
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "role": role,
            "created_at": now_utc(),
        })
        if is_first:
            await db.system_flags.update_one({"key": "bootstrap"}, {"$set": {"admin_created": True}})

    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600,
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc}


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    tok = await _resolve_session_token(request)
    if tok:
        await db.user_sessions.delete_many({"session_token": tok})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------- Pathways meta ----------------
@api.get("/pathways")
async def list_pathways(_: User = Depends(get_current_user)):
    return list(PATHWAY_META.values())


# ---------------- Criteria ----------------
@api.get("/criteria")
async def list_criteria(pathway_id: Optional[str] = None, user: User = Depends(get_current_user)):
    q = {}
    if pathway_id:
        q["pathway_id"] = pathway_id
    docs = await db.criteria.find(q, {"_id": 0}).sort("pathway_id", 1).to_list(1000)
    return docs


class CriterionUpdateIn(BaseModel):
    threshold: Optional[float] = None
    outcome: Optional[str] = None
    referral_target: Optional[str] = None
    citation: Optional[str] = None
    active: Optional[bool] = None
    approved: Optional[bool] = None
    label: Optional[str] = None
    description: Optional[str] = None


@api.patch("/criteria/{criterion_id}")
async def update_criterion(criterion_id: str, patch: CriterionUpdateIn, user: User = Depends(require_admin)):
    existing = await db.criteria.find_one({"criterion_id": criterion_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Criterion not found")
    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items() if v is not None or k in ("threshold",)}
    updates["version"] = existing.get("version", 1) + 1
    updates["updated_at"] = now_utc()
    updates["updated_by"] = user.user_id
    await db.criteria.update_one({"criterion_id": criterion_id}, {"$set": updates})
    return await db.criteria.find_one({"criterion_id": criterion_id}, {"_id": 0})


# ---------------- Patients ----------------
class PatientIn(BaseModel):
    initials: str
    dob: str
    mrn: str


@api.post("/patients")
async def create_patient(payload: PatientIn, user: User = Depends(get_current_user)):
    doc = {
        "patient_id": f"pat_{uuid.uuid4().hex[:12]}",
        "initials": payload.initials.strip(),
        "dob": payload.dob,
        "mrn": payload.mrn.strip(),
        "created_by": user.user_id,
        "created_at": now_utc(),
    }
    await db.patients.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/patients")
async def list_patients(user: User = Depends(get_current_user)):
    if user.role == "admin":
        q = {}
    else:
        q = {"created_by": user.user_id}
    docs = await db.patients.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/patients/{patient_id}")
async def get_patient(patient_id: str, user: User = Depends(get_current_user)):
    p = await db.patients.find_one({"patient_id": patient_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Patient not found")
    return p


# ---------------- Assessments ----------------
class AssessmentIn(BaseModel):
    pathway_id: str
    patient_id: Optional[str] = None
    input_data: Dict[str, Any]
    request_explanation: bool = True


async def _generate_explanation(pathway_id: str, decision: dict, input_data: dict) -> str:
    """Use Claude Sonnet 4.5 via EmergentIntegrations to produce a short lay-language rationale."""
    if not EMERGENT_LLM_KEY:
        return ""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        pathway_name = PATHWAY_META.get(pathway_id, {}).get("name", pathway_id)
        matches_text = "\n".join(
            f"- {m['label']} (source: {m['guideline_source']} — {m['citation']})"
            for m in decision.get("matched_criteria", [])
        ) or "No criteria matched."

        sys = (
            "You are a genetics-focused clinical explainer for OB/GYN providers. "
            "Write a short, factual, jargon-light rationale (max 4 sentences) that explains why "
            "the decision support tool produced the given referral outcome. "
            "Do NOT restate the decision label. Do NOT give medical advice or diagnoses. "
            "Always end with: 'Decision support only — clinical judgement required.'"
        )
        prompt = (
            f"Pathway: {pathway_name}\n"
            f"Outcome: {decision.get('outcome')}\n"
            f"Referral target: {decision.get('referral_target')}\n"
            f"Matched criteria:\n{matches_text}\n"
            f"Structured input data: {input_data}\n\n"
            "Write the rationale now."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"expl_{uuid.uuid4().hex[:8]}",
            system_message=sys,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=prompt))
        if isinstance(resp, str):
            return resp.strip()
        return getattr(resp, "content", str(resp)).strip()
    except Exception as e:
        logger.warning("LLM explanation failed: %s", e)
        return ""


@api.post("/assessments")
async def create_assessment(payload: AssessmentIn, user: User = Depends(get_current_user)):
    if payload.pathway_id not in PATHWAY_META:
        raise HTTPException(400, "Unknown pathway")
    criteria = await db.criteria.find(
        {"pathway_id": payload.pathway_id, "active": True, "approved": True}, {"_id": 0}
    ).to_list(500)
    decision = evaluate_pathway(payload.pathway_id, payload.input_data, criteria)

    explanation = ""
    if payload.request_explanation:
        explanation = await _generate_explanation(payload.pathway_id, decision, payload.input_data)

    doc = {
        "assessment_id": f"asm_{uuid.uuid4().hex[:12]}",
        "pathway_id": payload.pathway_id,
        "patient_id": payload.patient_id,
        "provider_user_id": user.user_id,
        "input_data": payload.input_data,
        "outcome": decision["outcome"],
        "referral_target": decision["referral_target"],
        "matched_criteria": decision["matched_criteria"],
        "explanation": explanation,
        "created_at": now_utc(),
    }
    await db.assessments.insert_one(doc)
    doc.pop("_id", None)
    # access log (de-identified)
    await db.access_log.insert_one({
        "log_id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "action": "assessment.create",
        "pathway_id": payload.pathway_id,
        "outcome": decision["outcome"],
        "at": now_utc(),
    })
    return doc


@api.get("/assessments")
async def list_assessments(patient_id: Optional[str] = None, user: User = Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if patient_id:
        q["patient_id"] = patient_id
    if user.role != "admin":
        q["provider_user_id"] = user.user_id
    docs = await db.assessments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str, user: User = Depends(get_current_user)):
    doc = await db.assessments.find_one({"assessment_id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Assessment not found")
    if user.role != "admin" and doc.get("provider_user_id") != user.user_id:
        raise HTTPException(403, "Forbidden")
    return doc


@api.get("/assessments/{assessment_id}/pdf")
async def assessment_pdf(assessment_id: str, user: User = Depends(get_current_user)):
    doc = await db.assessments.find_one({"assessment_id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Assessment not found")
    if user.role != "admin" and doc.get("provider_user_id") != user.user_id:
        raise HTTPException(403, "Forbidden")
    patient = None
    if doc.get("patient_id"):
        patient = await db.patients.find_one({"patient_id": doc["patient_id"]}, {"_id": 0})
    pathway_name = PATHWAY_META.get(doc["pathway_id"], {}).get("name", doc["pathway_id"])
    pdf_bytes = generate_referral_pdf(doc, patient, pathway_name)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="referral_{assessment_id}.pdf"'},
    )


# ---------------- Referrals tracking ----------------
class ReferralStatusIn(BaseModel):
    status: Literal["pending", "sent", "completed", "declined"]


@api.get("/referrals")
async def list_referrals(
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List assessments that produced a referral (outcome != no_referral),
    joined with patient data and a short 'reason' summary."""
    q: Dict[str, Any] = {"outcome": {"$in": ["urgent", "routine", "borderline"]}}
    if user.role != "admin":
        q["provider_user_id"] = user.user_id
    if status:
        q["referral_status"] = status
    asms = await db.assessments.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    patient_ids = list({a["patient_id"] for a in asms if a.get("patient_id")})
    patients = {}
    if patient_ids:
        docs = await db.patients.find({"patient_id": {"$in": patient_ids}}, {"_id": 0}).to_list(500)
        patients = {p["patient_id"]: p for p in docs}
    out = []
    for a in asms:
        matches = a.get("matched_criteria", []) or []
        reason = matches[0]["label"] if matches else "-"
        patient = patients.get(a.get("patient_id")) if a.get("patient_id") else None
        out.append({
            "assessment_id": a["assessment_id"],
            "pathway_id": a["pathway_id"],
            "outcome": a["outcome"],
            "referral_target": a.get("referral_target"),
            "reason": reason,
            "matched_criteria_count": len(matches),
            "patient_name": patient["initials"] if patient else None,
            "patient_mrn": patient["mrn"] if patient else None,
            "patient_id": a.get("patient_id"),
            "created_at": a["created_at"],
            "status": a.get("referral_status", "pending"),
        })
    return out


@api.patch("/referrals/{assessment_id}/status")
async def set_referral_status(assessment_id: str, payload: ReferralStatusIn, user: User = Depends(get_current_user)):
    doc = await db.assessments.find_one({"assessment_id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Assessment not found")
    if user.role != "admin" and doc.get("provider_user_id") != user.user_id:
        raise HTTPException(403, "Forbidden")
    await db.assessments.update_one(
        {"assessment_id": assessment_id},
        {"$set": {"referral_status": payload.status, "referral_status_at": now_utc()}},
    )
    return {"assessment_id": assessment_id, "status": payload.status}


# ---------------- Metrics (admin) ----------------
@api.get("/metrics/summary")
async def metrics_summary(user: User = Depends(require_admin)):
    # De-identified aggregates only
    pipe_by_pathway = [
        {"$group": {"_id": {"pathway": "$pathway_id", "outcome": "$outcome"}, "count": {"$sum": 1}}}
    ]
    rows = await db.assessments.aggregate(pipe_by_pathway).to_list(1000)
    by_pathway: Dict[str, Dict[str, int]] = {}
    for r in rows:
        p = r["_id"]["pathway"]
        o = r["_id"]["outcome"]
        by_pathway.setdefault(p, {"no_referral": 0, "borderline": 0, "routine": 0, "urgent": 0})
        by_pathway[p][o] = r["count"]

    total = await db.assessments.count_documents({})
    urgent = await db.assessments.count_documents({"outcome": "urgent"})
    routine = await db.assessments.count_documents({"outcome": "routine"})
    borderline = await db.assessments.count_documents({"outcome": "borderline"})
    no_ref = await db.assessments.count_documents({"outcome": "no_referral"})

    # last 14 days trend
    since = datetime.now(timezone.utc) - timedelta(days=14)
    recent = await db.assessments.find(
        {"created_at": {"$gte": since.isoformat()}}, {"_id": 0, "created_at": 1, "outcome": 1}
    ).to_list(2000)
    by_day: Dict[str, int] = {}
    for a in recent:
        d = a["created_at"][:10]
        by_day[d] = by_day.get(d, 0) + 1
    trend = [{"date": k, "count": v} for k, v in sorted(by_day.items())]

    return {
        "totals": {"total": total, "urgent": urgent, "routine": routine, "borderline": borderline, "no_referral": no_ref},
        "by_pathway": by_pathway,
        "trend_14d": trend,
    }


# ---------------- Admin users ----------------
@api.get("/admin/users")
async def list_users(user: User = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


class RoleUpdateIn(BaseModel):
    role: Literal["provider", "admin", "nurse", "genetic_counselor"]


@api.patch("/admin/users/{user_id}")
async def update_user_role(user_id: str, payload: RoleUpdateIn, user: User = Depends(require_admin)):
    r = await db.users.update_one({"user_id": user_id}, {"$set": {"role": payload.role}})
    if r.matched_count == 0:
        raise HTTPException(404, "User not found")
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})


# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
