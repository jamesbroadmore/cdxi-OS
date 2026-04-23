# cdxi OS — PRD

**Version**: v1.0 MVP · **Updated**: Apr 2026
**Tagline**: Operate the Venture. Automate the Growth.

## Original Problem Statement (abbrev.)
cdxi OS — an AI-native venture operating system unifying CRM, agency OS, automations, AI copilots/agents, proposals/contracts, finance, knowledge graph, client portals, project delivery, and a module marketplace. Mission-control feel, multi-tenant, enterprise-grade. See full master blueprint.

## User Choices (v1.0)
- Scope: Command Dashboard + CRM + Projects + Proposals + Client Portal (Phase 1)
- AI Copilot: **GPT-5.2** via Emergent Universal LLM Key
- Auth: JWT email/password (httpOnly cookies + Bearer)
- Design: Hybrid (Dark / Light toggle) — mission-control + luxury
- Multi-tenant from day 1 (Organization → Workspaces)
- Logo: "cdxi" in Righteous font

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) + MongoDB (`cdxi_os` db)
- **Frontend**: React CRA + Tailwind + Framer Motion + Recharts + Lucide
- **LLM**: `emergentintegrations.LlmChat` → OpenAI gpt-5.2 via `EMERGENT_LLM_KEY`
- **Auth**: bcrypt + PyJWT, `/api/auth/*`
- **Multi-tenant**: every resource endpoint requires `X-Workspace-Id` header, enforced by `require_workspace()` membership check

## Personas
- **Founder** (primary): Runs service business / venture studio; needs command deck + AI copilot
- **Operator**: Manages delivery, projects, proposals
- **Sales**: CRM-focused
- **Delivery team**: Projects/tasks
- **Client**: Read-only portal

## Core Modules Shipped (Jan 2026)
- **Atlas · Command Deck** — KPI cockpit (revenue, pipeline, MRR, client health, active projects, automation savings), 8-week revenue flow, pipeline stage mix, activity stream, operating modes
- **Pulse · CRM / Pipeline** — 8-stage kanban (Lead → Renewal) with drag-and-drop stage moves, CRUD deals, values & probability
- **Clients / Accounts** — card grid, health score bar, CRUD, share token → public client portal URL
- **Orbit · Projects** — project grid + detail view, 4-column task kanban (Backlog / In progress / Review / Done) with drag-and-drop, budget, progress
- **Vault · Proposals** — dynamic line items, auto-total, currency, status (draft/sent/accepted/declined)
- **Helix · Agents** — static catalog (Growth/Delivery/Operations), 6 personas, deploy/configure stubs
- **Client Portal** — public read-only view at `/portal/{token}` with projects + proposals
- **Atlas Copilot Dock** — right-side slide-out GPT-5.2 chat with markdown, quick prompts, session memory (Cmd+/)
- **Command Palette (Cmd+K)** — global search / navigate / create / invoke copilot
- **Workspace switcher** — top bar, multi-tenant isolation
- **Dark/Light theme toggle**
- **Auth** — register/login/logout/me with JWT (cookies + Bearer)

## Coming Soon (placeholders live)
- Forge · Automations (workflow canvas)
- Vault · Knowledge (SOPs / RAG)
- Pulse · Finance (invoicing, forecasting)
- Orbit · Studio (venture incubation)

## Backend Testing — iteration_1
- 25/25 backend tests pass: auth, workspaces, clients + portal, deals + stage patch, projects + tasks, proposals + auto-total, dashboard metrics, activity feed, agents, multi-tenant isolation (403 on cross-workspace), real GPT-5.2 copilot round-trip.
- Frontend: smoke-tested via screenshots (login, dashboard, CRM). Automated frontend test not yet run.

## Demo Credentials
- `admin@cdxi.os` / `admin123` (HQ Workspace seeded with 4 clients, 16 deals across stages, 3 projects + 15 tasks, 2 proposals)

## Prioritized Backlog
### P0 (next)
- Run frontend automated tests; lock down CORS to explicit origin; add brute-force lockout
- Client portal messaging + file uploads
- Automations (Forge) — workflow canvas MVP

### P1
- Knowledge (Vault) with semantic search (RAG)
- Finance (invoicing + Stripe)
- Richer agent runtime with tool calls

### P2
- Venture Studio (Orbit)
- Mobile companion
- White-label client portal themes
- Marketplace / installable modules
- SSO / MFA / audit logs

## Revenue Hooks (opportunistic)
- Per-workspace pricing tiers (Starter / Growth / Enterprise)
- Agent packs & template marketplace
- Usage-based AI credits (reporting in Copilot)
