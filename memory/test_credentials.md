# cdxi OS — Test Credentials

## Admin account (pre-seeded on server startup, password rotated if .env changes)
- **Email**: `parker@cdxi.au`
- **Password**: `220191`
- **Role**: `admin`
- **Workspace**: "HQ Workspace" (auto-created on first boot, seeded with demo clients/deals/projects/proposals)

## Auth endpoints
- `POST /api/auth/register` — { email, password, name, organization_name? }
- `POST /api/auth/login` — { email, password }
- `POST /api/auth/logout`
- `GET /api/auth/me`
- Cookies: `access_token` (24h), `refresh_token` (7d). Also accepts `Authorization: Bearer <token>`.

## Multi-tenant
- `GET /api/workspaces` — list workspaces for current user
- `POST /api/workspaces` — create workspace
- All resource endpoints require `X-Workspace-Id` header (auto-added by frontend interceptor).

## Client Portal (unauthenticated)
- `POST /api/clients/{id}/share` — issues `share_token` (authed)
- `GET /api/portal/{share_token}` — public read-only view
