"""
cdxi OS — FastAPI backend
Multi-tenant venture operating system.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, HTTPException, Depends, Request, Response, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient


# -------------- env + db --------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# -------------- helpers --------------
def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now() + timedelta(hours=24),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": now() + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=60 * 60 * 24, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=60 * 60 * 24 * 7, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def clean_doc(d: dict) -> dict:
    if d is None:
        return d
    d.pop("_id", None)
    return d


# -------------- models --------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    organization_name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class WorkspaceIn(BaseModel):
    name: str
    description: Optional[str] = ""


class ClientIn(BaseModel):
    name: str
    email: Optional[str] = ""
    company: Optional[str] = ""
    phone: Optional[str] = ""
    status: Literal["active", "at_risk", "churned", "prospect"] = "active"
    health_score: int = 80
    notes: Optional[str] = ""
    avatar_url: Optional[str] = ""


class DealIn(BaseModel):
    title: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    value: float = 0
    stage: Literal["lead", "discovery", "proposal", "won", "onboarding",
                   "delivery", "growth", "renewal", "lost"] = "lead"
    probability: int = 20
    owner: Optional[str] = ""
    notes: Optional[str] = ""
    close_date: Optional[str] = None


class DealStageUpdate(BaseModel):
    stage: str


class ProjectIn(BaseModel):
    name: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    status: Literal["planning", "active", "paused", "complete"] = "active"
    budget: float = 0
    progress: int = 0
    description: Optional[str] = ""
    due_date: Optional[str] = None


class TaskIn(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = ""
    status: Literal["backlog", "in_progress", "review", "done"] = "backlog"
    assignee: Optional[str] = ""
    priority: Literal["low", "med", "high"] = "med"
    due_date: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str


class ProposalLine(BaseModel):
    title: str
    description: Optional[str] = ""
    qty: float = 1
    rate: float = 0


class ProposalIn(BaseModel):
    title: str
    client_id: Optional[str] = None
    client_name: Optional[str] = ""
    status: Literal["draft", "sent", "accepted", "declined"] = "draft"
    currency: str = "USD"
    lines: List[ProposalLine] = []
    notes: Optional[str] = ""


class CopilotMessage(BaseModel):
    session_id: str
    message: str
    context: Optional[str] = None


# -------------- app --------------
app = FastAPI(title="cdxi OS")

origins_env = os.environ.get("CORS_ORIGINS", "*")
if origins_env == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

api = APIRouter(prefix="/api")


# -------------- workspace auth guard --------------
async def require_workspace(request: Request, user: dict) -> dict:
    """Resolve workspace_id from header X-Workspace-Id or user's default."""
    wid = request.headers.get("X-Workspace-Id")
    if not wid:
        # use default workspace for user's org
        mem = await db.memberships.find_one(
            {"user_id": user["id"]}, sort=[("created_at", 1)]
        )
        if not mem:
            raise HTTPException(400, "No workspace")
        wid = mem["workspace_id"]
    ws = await db.workspaces.find_one({"id": wid}, {"_id": 0})
    if not ws:
        raise HTTPException(404, "Workspace not found")
    mem = await db.memberships.find_one({"user_id": user["id"], "workspace_id": wid})
    if not mem:
        raise HTTPException(403, "No access to workspace")
    return ws


# ==========================================================
# AUTH
# ==========================================================
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")

    user_id = new_id()
    org_id = new_id()
    ws_id = new_id()
    org_name = data.organization_name or f"{data.name}'s Org"

    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "founder",
        "avatar_url": "",
        "created_at": now(),
    })
    await db.organizations.insert_one({
        "id": org_id, "name": org_name, "owner_id": user_id, "created_at": now(),
    })
    await db.workspaces.insert_one({
        "id": ws_id, "org_id": org_id, "name": "Main Workspace",
        "description": "Default workspace", "owner_id": user_id, "created_at": now(),
    })
    await db.memberships.insert_one({
        "id": new_id(), "user_id": user_id, "org_id": org_id,
        "workspace_id": ws_id, "role": "owner", "created_at": now(),
    })

    # seed a little demo data so first screen isn't empty
    await seed_demo(ws_id)

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "access_token": access, "workspace_id": ws_id}


@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower().strip()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(data.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    access = create_access_token(u["id"], u["email"])
    refresh = create_refresh_token(u["id"])
    set_auth_cookies(response, access, refresh)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return {"user": u, "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ==========================================================
# ORGS / WORKSPACES
# ==========================================================
@api.get("/workspaces")
async def list_workspaces(user: dict = Depends(get_current_user)):
    mems = await db.memberships.find({"user_id": user["id"]}).to_list(100)
    ws_ids = [m["workspace_id"] for m in mems]
    wss = await db.workspaces.find({"id": {"$in": ws_ids}}, {"_id": 0}).to_list(100)
    return wss


@api.post("/workspaces")
async def create_workspace(data: WorkspaceIn, user: dict = Depends(get_current_user)):
    # attach to user's first org
    mem = await db.memberships.find_one({"user_id": user["id"]}, sort=[("created_at", 1)])
    if not mem:
        raise HTTPException(400, "No org")
    wid = new_id()
    await db.workspaces.insert_one({
        "id": wid, "org_id": mem["org_id"], "name": data.name,
        "description": data.description, "owner_id": user["id"], "created_at": now(),
    })
    await db.memberships.insert_one({
        "id": new_id(), "user_id": user["id"], "org_id": mem["org_id"],
        "workspace_id": wid, "role": "owner", "created_at": now(),
    })
    ws = await db.workspaces.find_one({"id": wid}, {"_id": 0})
    return ws


# ==========================================================
# CLIENTS (CRM)
# ==========================================================
@api.get("/clients")
async def list_clients(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    items = await db.clients.find({"workspace_id": ws["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/clients")
async def create_client(data: ClientIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    doc = {"id": new_id(), "workspace_id": ws["id"], "created_at": now(), **data.dict()}
    await db.clients.insert_one(doc.copy())
    return clean_doc(doc)


@api.get("/clients/{cid}")
async def get_client(cid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    c = await db.clients.find_one({"id": cid, "workspace_id": ws["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Not found")
    return c


@api.put("/clients/{cid}")
async def update_client(cid: str, data: ClientIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.clients.update_one({"id": cid, "workspace_id": ws["id"]}, {"$set": data.dict()})
    return await db.clients.find_one({"id": cid, "workspace_id": ws["id"]}, {"_id": 0})


@api.delete("/clients/{cid}")
async def delete_client(cid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.clients.delete_one({"id": cid, "workspace_id": ws["id"]})
    return {"ok": True}


# ==========================================================
# DEALS
# ==========================================================
@api.get("/deals")
async def list_deals(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    return await db.deals.find({"workspace_id": ws["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/deals")
async def create_deal(data: DealIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    doc = {"id": new_id(), "workspace_id": ws["id"], "created_at": now(), **data.dict()}
    await db.deals.insert_one(doc.copy())
    return clean_doc(doc)


@api.put("/deals/{did}")
async def update_deal(did: str, data: DealIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.deals.update_one({"id": did, "workspace_id": ws["id"]}, {"$set": data.dict()})
    return await db.deals.find_one({"id": did, "workspace_id": ws["id"]}, {"_id": 0})


@api.patch("/deals/{did}/stage")
async def update_deal_stage(did: str, data: DealStageUpdate, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.deals.update_one({"id": did, "workspace_id": ws["id"]}, {"$set": {"stage": data.stage}})
    return await db.deals.find_one({"id": did, "workspace_id": ws["id"]}, {"_id": 0})


@api.delete("/deals/{did}")
async def delete_deal(did: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.deals.delete_one({"id": did, "workspace_id": ws["id"]})
    return {"ok": True}


# ==========================================================
# PROJECTS + TASKS
# ==========================================================
@api.get("/projects")
async def list_projects(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    return await db.projects.find({"workspace_id": ws["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/projects")
async def create_project(data: ProjectIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    doc = {"id": new_id(), "workspace_id": ws["id"], "created_at": now(), **data.dict()}
    await db.projects.insert_one(doc.copy())
    return clean_doc(doc)


@api.get("/projects/{pid}")
async def get_project(pid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    p = await db.projects.find_one({"id": pid, "workspace_id": ws["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p


@api.put("/projects/{pid}")
async def update_project(pid: str, data: ProjectIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.projects.update_one({"id": pid, "workspace_id": ws["id"]}, {"$set": data.dict()})
    return await db.projects.find_one({"id": pid, "workspace_id": ws["id"]}, {"_id": 0})


@api.delete("/projects/{pid}")
async def delete_project(pid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.projects.delete_one({"id": pid, "workspace_id": ws["id"]})
    await db.tasks.delete_many({"project_id": pid, "workspace_id": ws["id"]})
    return {"ok": True}


@api.get("/tasks")
async def list_tasks(request: Request, user: dict = Depends(get_current_user), project_id: Optional[str] = None):
    ws = await require_workspace(request, user)
    q = {"workspace_id": ws["id"]}
    if project_id:
        q["project_id"] = project_id
    return await db.tasks.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.post("/tasks")
async def create_task(data: TaskIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    doc = {"id": new_id(), "workspace_id": ws["id"], "created_at": now(), **data.dict()}
    await db.tasks.insert_one(doc.copy())
    return clean_doc(doc)


@api.patch("/tasks/{tid}/status")
async def update_task_status(tid: str, data: TaskStatusUpdate, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.tasks.update_one({"id": tid, "workspace_id": ws["id"]}, {"$set": {"status": data.status}})
    return await db.tasks.find_one({"id": tid, "workspace_id": ws["id"]}, {"_id": 0})


@api.delete("/tasks/{tid}")
async def delete_task(tid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.tasks.delete_one({"id": tid, "workspace_id": ws["id"]})
    return {"ok": True}


# ==========================================================
# PROPOSALS
# ==========================================================
@api.get("/proposals")
async def list_proposals(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    return await db.proposals.find({"workspace_id": ws["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/proposals")
async def create_proposal(data: ProposalIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    lines = [l.dict() for l in data.lines]
    total = sum((l["qty"] or 0) * (l["rate"] or 0) for l in lines)
    doc = {
        "id": new_id(), "workspace_id": ws["id"], "created_at": now(),
        **data.dict(), "lines": lines, "total": total,
    }
    await db.proposals.insert_one(doc.copy())
    return clean_doc(doc)


@api.get("/proposals/{pid}")
async def get_proposal(pid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    p = await db.proposals.find_one({"id": pid, "workspace_id": ws["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    return p


@api.put("/proposals/{pid}")
async def update_proposal(pid: str, data: ProposalIn, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    lines = [l.dict() for l in data.lines]
    total = sum((l["qty"] or 0) * (l["rate"] or 0) for l in lines)
    await db.proposals.update_one(
        {"id": pid, "workspace_id": ws["id"]},
        {"$set": {**data.dict(), "lines": lines, "total": total}},
    )
    return await db.proposals.find_one({"id": pid, "workspace_id": ws["id"]}, {"_id": 0})


@api.delete("/proposals/{pid}")
async def delete_proposal(pid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    await db.proposals.delete_one({"id": pid, "workspace_id": ws["id"]})
    return {"ok": True}


# ==========================================================
# CLIENT PORTAL (public-ish: requires client token)
# We expose a minimal read-only view keyed by client_id share_token.
# ==========================================================
@api.get("/portal/{share_token}")
async def portal_view(share_token: str):
    c = await db.clients.find_one({"share_token": share_token}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Not found")
    projects = await db.projects.find({"client_id": c["id"], "workspace_id": c["workspace_id"]}, {"_id": 0}).to_list(100)
    proposals = await db.proposals.find({"client_id": c["id"], "workspace_id": c["workspace_id"]}, {"_id": 0}).to_list(100)
    return {"client": c, "projects": projects, "proposals": proposals}


@api.post("/clients/{cid}/share")
async def issue_share_token(cid: str, request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    token = secrets.token_urlsafe(24)
    await db.clients.update_one(
        {"id": cid, "workspace_id": ws["id"]},
        {"$set": {"share_token": token}}
    )
    return {"share_token": token}


# ==========================================================
# DASHBOARD METRICS
# ==========================================================
@api.get("/dashboard/metrics")
async def dashboard_metrics(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    wid = ws["id"]

    deals = await db.deals.find({"workspace_id": wid}, {"_id": 0}).to_list(1000)
    projects = await db.projects.find({"workspace_id": wid}, {"_id": 0}).to_list(1000)
    clients = await db.clients.find({"workspace_id": wid}, {"_id": 0}).to_list(1000)
    proposals = await db.proposals.find({"workspace_id": wid}, {"_id": 0}).to_list(1000)
    tasks = await db.tasks.find({"workspace_id": wid}, {"_id": 0}).to_list(1000)

    pipeline_value = sum((d.get("value") or 0) for d in deals if d.get("stage") not in ("won", "lost"))
    won_value = sum((d.get("value") or 0) for d in deals if d.get("stage") == "won")
    mrr = sum((d.get("value") or 0) for d in deals if d.get("stage") in ("growth", "renewal", "delivery")) / 12.0

    client_health = 0
    if clients:
        client_health = round(sum((c.get("health_score") or 0) for c in clients) / len(clients))

    active_projects = len([p for p in projects if p.get("status") == "active"])

    # fake 8-week revenue trend based on deals
    trend = []
    import random
    rnd = random.Random(42)
    for i in range(8):
        base = won_value / 8 if won_value else 8000
        trend.append({"week": f"W{i+1}", "revenue": round(base * (0.7 + rnd.random() * 0.6))})

    pipeline_by_stage = {}
    for d in deals:
        s = d.get("stage", "lead")
        pipeline_by_stage[s] = pipeline_by_stage.get(s, 0) + (d.get("value") or 0)

    stage_data = [{"stage": k, "value": v} for k, v in pipeline_by_stage.items()]

    return {
        "revenue": round(won_value, 2),
        "pipeline": round(pipeline_value, 2),
        "mrr": round(mrr, 2),
        "client_health": client_health,
        "active_projects": active_projects,
        "total_clients": len(clients),
        "total_deals": len(deals),
        "total_proposals": len(proposals),
        "open_tasks": len([t for t in tasks if t.get("status") != "done"]),
        "automation_savings": round(won_value * 0.08, 2),
        "team_capacity": 72,
        "revenue_trend": trend,
        "pipeline_by_stage": stage_data,
    }


# ==========================================================
# ACTIVITY FEED
# ==========================================================
@api.get("/activity")
async def activity(request: Request, user: dict = Depends(get_current_user)):
    ws = await require_workspace(request, user)
    wid = ws["id"]
    items = []
    deals = await db.deals.find({"workspace_id": wid}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    clients = await db.clients.find({"workspace_id": wid}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    projects = await db.projects.find({"workspace_id": wid}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    for d in deals:
        items.append({
            "type": "deal", "title": f"Deal: {d['title']}",
            "subtitle": f"${d.get('value',0):,.0f} · {d.get('stage')}",
            "at": d.get("created_at")
        })
    for c in clients:
        items.append({"type": "client", "title": f"Client: {c['name']}", "subtitle": c.get("company",""), "at": c.get("created_at")})
    for p in projects:
        items.append({"type": "project", "title": f"Project: {p['name']}", "subtitle": p.get("status"), "at": p.get("created_at")})
    items.sort(key=lambda x: x["at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    for it in items:
        if isinstance(it.get("at"), datetime):
            it["at"] = it["at"].isoformat()
    return items[:20]


# ==========================================================
# AGENTS (static catalog for MVP)
# ==========================================================
AGENT_CATALOG = [
    {"id": "growth-lead-gen", "category": "Growth", "name": "Lead Gen Strategist",
     "persona": "Helix · Growth-01", "description": "Finds, qualifies and enriches inbound & outbound leads.",
     "skills": ["ICP mapping", "Enrichment", "Outreach copy"], "status": "ready"},
    {"id": "growth-sales-outreach", "category": "Growth", "name": "Sales Outreach Agent",
     "persona": "Helix · Growth-02", "description": "Drafts multi-step email sequences and follows up at optimal cadence.",
     "skills": ["Sequences", "A/B tests", "Reply mining"], "status": "ready"},
    {"id": "delivery-content", "category": "Delivery", "name": "Content Writer",
     "persona": "Helix · Delivery-01", "description": "Produces long-form articles, briefs and social content in your brand voice.",
     "skills": ["SEO briefs", "Long-form", "Rewrites"], "status": "ready"},
    {"id": "delivery-proposal", "category": "Delivery", "name": "Proposal Drafter",
     "persona": "Helix · Delivery-02", "description": "Builds tailored proposals with pricing logic and scope.",
     "skills": ["Scope", "Pricing", "SOW"], "status": "ready"},
    {"id": "ops-admin", "category": "Operations", "name": "Admin Assistant",
     "persona": "Helix · Ops-01", "description": "Schedules, reminds and organises your day across calendars and inbox.",
     "skills": ["Scheduling", "Inbox triage", "Notes"], "status": "beta"},
    {"id": "ops-finance", "category": "Operations", "name": "Finance Analyst",
     "persona": "Helix · Ops-02", "description": "Tracks cashflow, profitability, deal economics and generates reports.",
     "skills": ["P&L", "Forecasting", "Deal econ"], "status": "beta"},
]


@api.get("/agents")
async def agents():
    return AGENT_CATALOG


# ==========================================================
# AI COPILOT
# ==========================================================
@api.post("/copilot/chat")
async def copilot_chat(data: CopilotMessage, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "LLM key not configured")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"emergentintegrations not available: {e}")

    system = (
        "You are Atlas, the AI copilot for cdxi OS — an AI-native venture operating system. "
        "You help founders and operators run their business: CRM, deals, projects, proposals, and knowledge. "
        "Be concise, strategic and action-oriented. Use short paragraphs and bullet points where helpful. "
        "When asked, draft proposals, outreach, SOPs, summaries and plans. Respond in markdown."
    )
    if data.context:
        system += f"\n\nWorkspace context:\n{data.context}"

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=data.session_id,
        system_message=system,
    ).with_model("openai", "gpt-5.2")

    try:
        reply = await chat.send_message(UserMessage(text=data.message))
    except Exception as e:
        raise HTTPException(500, f"LLM error: {e}")

    # persist
    await db.copilot_messages.insert_many([
        {"id": new_id(), "session_id": data.session_id, "user_id": user["id"],
         "role": "user", "content": data.message, "created_at": now()},
        {"id": new_id(), "session_id": data.session_id, "user_id": user["id"],
         "role": "assistant", "content": reply, "created_at": now()},
    ])
    return {"reply": reply}


@api.get("/copilot/history/{session_id}")
async def copilot_history(session_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.copilot_messages.find(
        {"session_id": session_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    for m in msgs:
        if isinstance(m.get("created_at"), datetime):
            m["created_at"] = m["created_at"].isoformat()
    return msgs


# ==========================================================
# DEMO SEED
# ==========================================================
async def seed_demo(workspace_id: str):
    sample_clients = [
        {"name": "Nova Robotics", "company": "Nova Robotics", "email": "ops@novarobotics.io",
         "status": "active", "health_score": 92, "avatar_url": ""},
        {"name": "Halcyon Ventures", "company": "Halcyon Ventures", "email": "hello@halcyon.vc",
         "status": "active", "health_score": 78, "avatar_url": ""},
        {"name": "Meridian Capital", "company": "Meridian Capital", "email": "pm@meridian.cap",
         "status": "at_risk", "health_score": 54, "avatar_url": ""},
        {"name": "Orbit Studios", "company": "Orbit Studios", "email": "team@orbit.studio",
         "status": "prospect", "health_score": 65, "avatar_url": ""},
    ]
    client_ids = []
    for c in sample_clients:
        cid = new_id()
        client_ids.append((cid, c["name"]))
        await db.clients.insert_one({
            "id": cid, "workspace_id": workspace_id, "created_at": now(),
            "phone": "", "notes": "", **c
        })

    stages = ["lead", "discovery", "proposal", "won", "onboarding", "delivery", "growth", "renewal"]
    values = [12000, 24500, 48000, 92000, 65000, 31000, 140000, 56000]
    for i, (cid, name) in enumerate(client_ids * 2):
        await db.deals.insert_one({
            "id": new_id(), "workspace_id": workspace_id, "created_at": now(),
            "title": f"{name} — {['Retainer','Rebrand','Growth Ops','Platform Build'][i % 4]}",
            "client_id": cid, "client_name": name,
            "value": values[i % len(values)],
            "stage": stages[i % len(stages)],
            "probability": 30 + (i * 9) % 60,
            "owner": "You", "notes": "", "close_date": None,
        })

    # projects
    for cid, name in client_ids[:3]:
        pid = new_id()
        await db.projects.insert_one({
            "id": pid, "workspace_id": workspace_id, "created_at": now(),
            "name": f"{name} · Delivery", "client_id": cid, "client_name": name,
            "status": "active", "budget": 48000, "progress": 45,
            "description": "Core delivery engagement", "due_date": None,
        })
        for ti, title in enumerate(["Discovery workshop", "Design system", "MVP build", "Launch plan", "Retro"]):
            await db.tasks.insert_one({
                "id": new_id(), "workspace_id": workspace_id, "created_at": now(),
                "project_id": pid, "title": title, "description": "",
                "status": ["done", "in_progress", "backlog", "review", "backlog"][ti],
                "assignee": "You", "priority": "med", "due_date": None,
            })

    # proposals
    for cid, name in client_ids[:2]:
        await db.proposals.insert_one({
            "id": new_id(), "workspace_id": workspace_id, "created_at": now(),
            "title": f"{name} · Growth Retainer",
            "client_id": cid, "client_name": name,
            "status": "sent", "currency": "USD",
            "lines": [
                {"title": "Strategy", "description": "Monthly strategy & roadmap", "qty": 1, "rate": 4500},
                {"title": "Execution", "description": "Ops + delivery team", "qty": 1, "rate": 8500},
            ],
            "total": 13000, "notes": "",
        })


# ==========================================================
# STARTUP
# ==========================================================
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.memberships.create_index([("user_id", 1), ("workspace_id", 1)])
    await db.clients.create_index("workspace_id")
    await db.deals.create_index("workspace_id")
    await db.projects.create_index("workspace_id")
    await db.tasks.create_index("workspace_id")
    await db.proposals.create_index("workspace_id")
    await db.clients.create_index("share_token")
    # admin seed (idempotent — rotates password if .env changes)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@cdxi.os")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user_id = new_id()
        org_id = new_id()
        ws_id = new_id()
        await db.users.insert_one({
            "id": user_id, "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "cdxi Admin", "role": "admin", "avatar_url": "", "created_at": now(),
        })
        await db.organizations.insert_one({
            "id": org_id, "name": "cdxi HQ", "owner_id": user_id, "created_at": now(),
        })
        await db.workspaces.insert_one({
            "id": ws_id, "org_id": org_id, "name": "HQ Workspace",
            "description": "Admin workspace", "owner_id": user_id, "created_at": now(),
        })
        await db.memberships.insert_one({
            "id": new_id(), "user_id": user_id, "org_id": org_id,
            "workspace_id": ws_id, "role": "owner", "created_at": now(),
        })
        await seed_demo(ws_id)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@api.get("/health")
async def health():
    return {"status": "ok", "time": now().isoformat()}


app.include_router(api)
