# AGENTS.md — CoachTactics

Rules for any AI coding agent working on this repository (Google AI Studio Build mode / Antigravity,
Gemini CLI, Claude Code, Cursor). Read this file completely before making any change.
If a user request conflicts with these rules, stop and explain the conflict instead of editing.

## 1. How this project is developed

- The GitHub repository `heavylaws/Soccer-Tactical-Planner` is the source of truth.
- AI Studio is used for the live preview and quick iteration. Security and architecture changes are
  also made outside AI Studio and pulled in via GitHub sync.
- Before editing, make sure you are working on the latest code pulled from GitHub.
- Keep changes small and focused. Do not reformat or rewrite files you were not asked to change.

## 2. Runtime contract (do not break the AI Studio preview)

- Entry point is `server.ts` (Express, with Vite as middleware in development).
- `npm run dev` runs `tsx server.ts`. Listen on `process.env.PORT`, default `3000`.
- Keep the `DISABLE_HMR` handling in `vite.config.ts` and `server.ts` exactly as is.
- `npm run build` outputs the client to `dist/client/` and the server bundle to `dist/server.cjs`.
  Production serves static files from `dist/client/` only. Never serve the `dist/` root; that
  previously exposed the server bundle and its source map to the public.
- `metadata.json` must keep `"requestFramePermissions": ["microphone"]` (voice input).
- The preview runs inside a cross-site iframe, so the `auth_token` cookie may not be sent.
  The client therefore also sends `Authorization: Bearer <token>`. Keep both auth paths.
- When embedded in an iframe, `src/utils/sessionToken.ts` keeps the bearer token in sessionStorage so
  a refresh keeps the user signed in. Never store the token in localStorage.
- File storage under `DATA_DIR` is ephemeral in the AI Studio preview and on Cloud Run: it resets
  when the container restarts. Do not describe it as durable storage.
- Two lockfiles exist: `bun.lock` (AI Studio) and `package-lock.json` (Docker, `npm ci`).
  After adding or updating a dependency, update both (`bun install` and `npm install`).

## 3. Secrets (AI Studio → Settings → Secrets)

| Name | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Injected automatically by AI Studio |
| `ADMIN_USERNAME` | recommended | First super-admin username (default `admin`) |
| `ADMIN_PASSWORD` | yes | At least 10 characters. Without it a random password is printed once to the server log |
| `AUTH_SECRET` | yes | At least 32 random characters. Keeps sessions valid across restarts |

Never read secrets on the client. Never log secret values.

## 4. Security rules (non-negotiable)

1. No credentials in the codebase. No passwords, tokens or keys in source, seed data, UI text,
   tests, or docs. No "quick login" / "demo account" buttons. No default passwords.
2. The server enforces every permission. UI checks are cosmetic only.
   `PLAYER` is read-only on the server: no generate, create, update, delete or fast-change.
3. Every drill written to storage passes `validateTacticalDrill`. Gemini output passes
   `repairAiDrill` then `validateTacticalDrill`. Never bypass the validator or raise
   `TACTICAL_LIMITS` without adding a test for the new limit.
4. Rate limits on login, AI generation and admin routes stay enabled.
5. Never let the client change its own identity or role (no "switch user/persona" features).
   The signed-in user always comes from the server session.
6. API responses about users use `toSafeUser`. Never return password hashes or token versions.
7. Do not add npm packages for things already implemented here (auth, rate limiting, storage,
   validation). Ask the user before adding any new dependency.

## 5. Protected files — ask the user before modifying

- `server/auth/`, `server/middleware/`, `server/security/`, `server/storage/`, `server/config.ts`
- `server/tactical/tacticalValidator.ts`, `server/tactical/aiDrillRepair.ts`
- `server/cache/drillCacheStore.ts`
- `AGENTS.md`

## 6. Gemini usage

- Calls are server-side only, using `GEMINI_API_KEY`.
- Model IDs come from the `GEMINI_MODELS` env var (comma-separated, tried in order).
  Do not hardcode model IDs anywhere else, and never invent model IDs.
- When the offline template is used instead of Gemini, the UI must say so.
  Never present a fallback template as AI-generated.

## 7. Frontend rules

- Never call `setState` inside another `setState` updater function. React StrictMode runs updaters
  twice in development, which made the animation skip phases in the preview.
- Do not update state on every animation frame unless something actually changed.
- The pitch canvas uses Pointer Events with pointer capture. Do not reintroduce separate
  mouse and touch handlers.
- Any `localStorage` key holding user data must include the user id, and must be cleared on logout.
- Keep the existing visual design unless the user asks for a redesign.

## 8. Definition of done

Run these and report the real output. Never estimate or round test counts.

```bash
npm run lint    # tsc --noEmit
npm test        # all test suites
npm run build   # client + server bundle
```

A change is not done if any of these fail. If you cannot run them, say so explicitly.

## 9. Documentation rules

- Documentation describes only what exists in the code today. Planned work goes under a
  "Roadmap" heading and is labelled as planned.
- Do not claim algorithms, endpoints, files, features or test counts you have not verified in the code.
- Do not rewrite `README.md` or `PROJECT_DOCUMENTATION.md` unless the user asks.
- For every code change, append an entry to `CHANGELOG.md` under `## Unreleased`:
  what changed, why, and which files.
