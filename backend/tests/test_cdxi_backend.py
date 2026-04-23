"""
cdxi OS — comprehensive backend test suite
Covers auth, workspaces, clients (CRM), deals, projects, tasks, proposals,
dashboard metrics, activity, agents, portal share, copilot chat,
and multi-tenancy isolation.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend env (for local execution)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
    except Exception:
        pass

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@cdxi.os"
ADMIN_PASSWORD = "admin123"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_auth(http):
    """Login as admin -> return (token, workspace_id, user)."""
    r = http.post(f"{API}/auth/login",
                  json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("access_token")
    assert token, "access_token missing"
    # workspaces
    r2 = http.get(f"{API}/workspaces",
                  headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200, r2.text
    wss = r2.json()
    assert isinstance(wss, list) and len(wss) >= 1
    # pick HQ Workspace if found
    hq = next((w for w in wss if w.get("name") == "HQ Workspace"), wss[0])
    return {"token": token, "workspace_id": hq["id"], "user": data["user"]}


@pytest.fixture(scope="session")
def auth_headers(admin_auth):
    return {
        "Authorization": f"Bearer {admin_auth['token']}",
        "X-Workspace-Id": admin_auth["workspace_id"],
        "Content-Type": "application/json",
    }


# ---------------- health ----------------
def test_health(http):
    r = http.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------- auth ----------------
class TestAuth:
    def test_login_success(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["user"]["email"] == ADMIN_EMAIL
        # cookies
        cookies = r.cookies
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_login_invalid(self, http):
        r = http.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_bearer(self, http, admin_auth):
        r = http.get(f"{API}/auth/me",
                     headers={"Authorization": f"Bearer {admin_auth['token']}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL
        # ensure password hash not exposed
        assert "password_hash" not in r.json()

    def test_me_unauthenticated(self):
        # use a fresh session (no cookies) to assert unauthenticated 401
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_register_new_user_and_seeded(self, http):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = http.post(f"{API}/auth/register",
                      json={"email": email, "password": "pass1234",
                            "name": "Test User", "organization_name": "TEST_Org"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == email
        assert "access_token" in data
        assert "workspace_id" in data
        token = data["access_token"]
        wid = data["workspace_id"]
        # verify seeded clients present in this user's workspace
        r2 = http.get(f"{API}/clients",
                      headers={"Authorization": f"Bearer {token}",
                               "X-Workspace-Id": wid})
        assert r2.status_code == 200
        assert len(r2.json()) >= 4

    def test_register_duplicate(self, http):
        r = http.post(f"{API}/auth/register",
                      json={"email": ADMIN_EMAIL, "password": "whatever",
                            "name": "x"})
        assert r.status_code == 400

    def test_logout(self, http):
        r = http.post(f"{API}/auth/logout")
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ---------------- workspaces ----------------
class TestWorkspaces:
    def test_list_workspaces(self, http, admin_auth):
        r = http.get(f"{API}/workspaces",
                     headers={"Authorization": f"Bearer {admin_auth['token']}"})
        assert r.status_code == 200
        wss = r.json()
        assert any(w["id"] == admin_auth["workspace_id"] for w in wss)

    def test_create_workspace(self, http, admin_auth):
        name = f"TEST_WS_{uuid.uuid4().hex[:6]}"
        r = http.post(f"{API}/workspaces",
                      headers={"Authorization": f"Bearer {admin_auth['token']}"},
                      json={"name": name, "description": "test"})
        assert r.status_code == 200
        assert r.json()["name"] == name


# ---------------- clients (CRM) ----------------
class TestClients:
    def test_list_seeded_clients(self, http, auth_headers):
        r = http.get(f"{API}/clients", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 4

    def test_requires_auth(self, http):
        r = http.get(f"{API}/clients")
        assert r.status_code == 401

    def test_client_crud_and_share(self, http, auth_headers):
        # CREATE
        payload = {"name": "TEST_Client_A", "email": "ta@test.io",
                   "company": "TCorp", "status": "active", "health_score": 88}
        r = http.post(f"{API}/clients", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == payload["name"]
        assert "id" in created and created.get("workspace_id")
        cid = created["id"]
        # GET
        r2 = http.get(f"{API}/clients/{cid}", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["name"] == payload["name"]
        # UPDATE
        up = {**payload, "name": "TEST_Client_A_UPD", "health_score": 95}
        r3 = http.put(f"{API}/clients/{cid}", headers=auth_headers, json=up)
        assert r3.status_code == 200
        assert r3.json()["name"] == "TEST_Client_A_UPD"
        assert r3.json()["health_score"] == 95
        # SHARE
        r4 = http.post(f"{API}/clients/{cid}/share", headers=auth_headers)
        assert r4.status_code == 200
        token = r4.json().get("share_token")
        assert token and isinstance(token, str) and len(token) > 10
        # PORTAL (public)
        r5 = requests.get(f"{API}/portal/{token}")
        assert r5.status_code == 200
        pv = r5.json()
        assert "client" in pv and pv["client"]["id"] == cid
        assert "projects" in pv and "proposals" in pv
        # DELETE
        r6 = http.delete(f"{API}/clients/{cid}", headers=auth_headers)
        assert r6.status_code == 200
        r7 = http.get(f"{API}/clients/{cid}", headers=auth_headers)
        assert r7.status_code == 404


# ---------------- deals ----------------
class TestDeals:
    def test_list_seeded(self, http, auth_headers):
        r = http.get(f"{API}/deals", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 1

    def test_deal_crud_and_stage(self, http, auth_headers):
        r = http.post(f"{API}/deals", headers=auth_headers,
                      json={"title": "TEST_Deal", "value": 5000,
                            "stage": "lead", "probability": 30})
        assert r.status_code == 200
        did = r.json()["id"]
        # stage patch
        r2 = http.patch(f"{API}/deals/{did}/stage",
                        headers=auth_headers, json={"stage": "won"})
        assert r2.status_code == 200
        assert r2.json()["stage"] == "won"
        # update
        r3 = http.put(f"{API}/deals/{did}", headers=auth_headers,
                      json={"title": "TEST_Deal_UPD", "value": 7500,
                            "stage": "won", "probability": 90})
        assert r3.status_code == 200
        assert r3.json()["value"] == 7500
        # delete
        r4 = http.delete(f"{API}/deals/{did}", headers=auth_headers)
        assert r4.status_code == 200


# ---------------- projects + tasks ----------------
class TestProjectsTasks:
    def test_list_seeded_projects(self, http, auth_headers):
        r = http.get(f"{API}/projects", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_project_and_task_flow(self, http, auth_headers):
        r = http.post(f"{API}/projects", headers=auth_headers,
                      json={"name": "TEST_Project", "status": "active",
                            "budget": 10000, "progress": 10})
        assert r.status_code == 200
        pid = r.json()["id"]
        # update
        r2 = http.put(f"{API}/projects/{pid}", headers=auth_headers,
                      json={"name": "TEST_Project_UPD", "status": "active",
                            "budget": 12000, "progress": 50})
        assert r2.status_code == 200
        assert r2.json()["budget"] == 12000
        # create task
        rt = http.post(f"{API}/tasks", headers=auth_headers,
                       json={"project_id": pid, "title": "TEST_Task",
                             "status": "backlog", "priority": "med"})
        assert rt.status_code == 200
        tid = rt.json()["id"]
        # list tasks by project
        rl = http.get(f"{API}/tasks", headers=auth_headers,
                      params={"project_id": pid})
        assert rl.status_code == 200
        assert any(t["id"] == tid for t in rl.json())
        # status patch
        rs = http.patch(f"{API}/tasks/{tid}/status", headers=auth_headers,
                        json={"status": "done"})
        assert rs.status_code == 200
        assert rs.json()["status"] == "done"
        # delete project (cascades tasks)
        rd = http.delete(f"{API}/projects/{pid}", headers=auth_headers)
        assert rd.status_code == 200


# ---------------- proposals ----------------
class TestProposals:
    def test_list_seeded(self, http, auth_headers):
        r = http.get(f"{API}/proposals", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_proposal_total_autocalc(self, http, auth_headers):
        r = http.post(f"{API}/proposals", headers=auth_headers, json={
            "title": "TEST_Prop", "status": "draft", "currency": "USD",
            "lines": [
                {"title": "A", "qty": 2, "rate": 100},
                {"title": "B", "qty": 1, "rate": 250},
            ],
        })
        assert r.status_code == 200
        doc = r.json()
        assert doc["total"] == 450
        pid = doc["id"]
        # update with new totals
        r2 = http.put(f"{API}/proposals/{pid}", headers=auth_headers, json={
            "title": "TEST_Prop_UPD", "status": "sent", "currency": "USD",
            "lines": [{"title": "X", "qty": 3, "rate": 500}],
        })
        assert r2.status_code == 200
        assert r2.json()["total"] == 1500
        # delete
        r3 = http.delete(f"{API}/proposals/{pid}", headers=auth_headers)
        assert r3.status_code == 200


# ---------------- dashboard + activity + agents ----------------
class TestDashboard:
    def test_metrics_shape(self, http, auth_headers):
        r = http.get(f"{API}/dashboard/metrics", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["revenue", "pipeline", "mrr", "client_health",
                  "active_projects", "total_clients", "total_deals",
                  "total_proposals", "revenue_trend", "pipeline_by_stage"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["revenue_trend"], list) and len(d["revenue_trend"]) == 8
        assert isinstance(d["pipeline_by_stage"], list)

    def test_activity(self, http, auth_headers):
        r = http.get(f"{API}/activity", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) <= 20
        if items:
            assert {"type", "title", "at"}.issubset(items[0].keys())

    def test_agents(self, http, auth_headers):
        r = http.get(f"{API}/agents", headers=auth_headers)
        assert r.status_code == 200
        cat = r.json()
        assert len(cat) == 6
        assert {"id", "category", "name"}.issubset(cat[0].keys())


# ---------------- multi-tenancy isolation ----------------
class TestMultiTenancy:
    def test_isolation(self, http, admin_auth, auth_headers):
        # create a new workspace for admin
        name = f"TEST_ISO_{uuid.uuid4().hex[:6]}"
        rw = http.post(f"{API}/workspaces",
                       headers={"Authorization": f"Bearer {admin_auth['token']}"},
                       json={"name": name})
        assert rw.status_code == 200
        new_wid = rw.json()["id"]
        # create client in HQ workspace
        hc = http.post(f"{API}/clients", headers=auth_headers,
                       json={"name": "TEST_IsoClient", "email": "iso@t.io"})
        assert hc.status_code == 200
        hq_cid = hc.json()["id"]
        # fetch clients using new workspace header -> must not contain hq_cid
        hdrs = {"Authorization": f"Bearer {admin_auth['token']}",
                "X-Workspace-Id": new_wid}
        rl = http.get(f"{API}/clients", headers=hdrs)
        assert rl.status_code == 200
        assert all(c["id"] != hq_cid for c in rl.json())
        # cleanup
        http.delete(f"{API}/clients/{hq_cid}", headers=auth_headers)

    def test_foreign_workspace_forbidden(self, http, auth_headers, admin_auth):
        # Register a new user
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = http.post(f"{API}/auth/register",
                      json={"email": email, "password": "pass1234",
                            "name": "Other"})
        assert r.status_code == 200
        other_token = r.json()["access_token"]
        # try to access admin workspace with other user
        r2 = http.get(f"{API}/clients",
                      headers={"Authorization": f"Bearer {other_token}",
                               "X-Workspace-Id": admin_auth["workspace_id"]})
        assert r2.status_code == 403


# ---------------- copilot ----------------
class TestCopilot:
    def test_copilot_chat(self, http, auth_headers):
        sid = f"test-{uuid.uuid4().hex[:8]}"
        r = http.post(f"{API}/copilot/chat", headers=auth_headers,
                      json={"session_id": sid,
                            "message": "Say hello in one short sentence."},
                      timeout=90)
        assert r.status_code == 200, r.text
        reply = r.json().get("reply", "")
        assert isinstance(reply, str) and len(reply.strip()) > 0
        # history should have 2 messages (user+assistant)
        r2 = http.get(f"{API}/copilot/history/{sid}", headers=auth_headers)
        assert r2.status_code == 200
        assert len(r2.json()) == 2
