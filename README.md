# CoachTactics

A soccer tactical board for coaches. Design multi-phase drills on an animated pitch, draw over them
with telestrator tools, and generate starting drafts from a text or voice description using Gemini.
The coach can edit everything the AI produces.

Version 2.1.0. See [`CHANGELOG.md`](./CHANGELOG.md) for what changed and
[`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) for architecture and the security model.

## Stack

React 19 + Vite + Tailwind on the client, Express on Node 22 on the server, TypeScript throughout.
Gemini is called only from the server. No database is required: data is stored as JSON files.

## Run it

### Google AI Studio (current preview)

1. In **Settings → Secrets**, set `ADMIN_USERNAME`, `ADMIN_PASSWORD` (10+ characters) and
   `AUTH_SECRET` (32+ random characters). `GEMINI_API_KEY` is provided automatically.
2. Pull the latest code from GitHub (**Settings → GitHub**).
3. Open the preview and sign in with the admin credentials you set.

The preview container's storage is temporary: users and drills reset when it restarts, and the
admin account is recreated from your secrets.

### Locally

```bash
npm install
cp .env.example .env      # then fill in the values
npm run dev               # http://localhost:3000
```

### Self-hosted with Docker

```bash
cp .env.example .env      # fill in ADMIN_PASSWORD, AUTH_SECRET, GEMINI_API_KEY
docker compose up -d --build
```

The container listens on `127.0.0.1:3000` only. Put a TLS reverse proxy (Caddy, Nginx, Traefik)
in front of it. Data lives in the `coachtactics-data` volume; back it up like any other volume.

### Other production hosting

```bash
npm ci
npm run build
npm start                 # serves dist/client and the API on $PORT
```

Mount persistent storage at `DATA_DIR`. On Cloud Run the filesystem is temporary unless you attach
a volume.

## Environment variables

All variables are documented in [`.env.example`](./.env.example). The important ones:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI generation | Without it, generation falls back to the offline template engine and says so |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Yes | First super administrator, created when none exists |
| `AUTH_SECRET` | Yes in production | Signs session tokens; keeps users signed in across restarts |
| `DATA_DIR` | Production | Where `users.json`, `drills.json` and the auth secret are stored |
| `GEMINI_MODELS` | No | Models tried in order. Default: `gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash` |

Forgot the admin password on a self-hosted install? Set `ADMIN_RESET_PASSWORD=true` with a new
`ADMIN_PASSWORD`, restart once, then remove `ADMIN_RESET_PASSWORD`.

## Test

```bash
npm run lint    # type check
npm test        # all test suites
npm run build   # production build
npm run check   # all three
```

## Roles

| Role | Can do |
|---|---|
| `SUPER_ADMIN` | Everything, including user management and clearing the AI cache |
| `HEAD_COACH`, `ASSISTANT_COACH` | Create, edit and delete their own drills; generate with AI; view system drills |
| `CLIENT` | Same as coaches, but sees only their own drills (no system drills) |
| `PLAYER` | Read-only: views system drills. The server rejects all writes and AI generation |

## Working with AI coding agents

Rules for AI agents (AI Studio, Gemini CLI, Claude Code, Cursor) are in [`AGENTS.md`](./AGENTS.md).
The GitHub repository is the source of truth; AI Studio syncs with it.
