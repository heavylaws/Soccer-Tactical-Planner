# CoachTactics — Project Documentation

Version 2.1.0. This document describes the code as it exists in this repository. Anything not yet
built is listed under [Roadmap](#8-roadmap) and labelled as planned.

## 1. Product

CoachTactics is a tactical board for soccer coaches:

- **Tactical board:** a canvas pitch (full or half view) showing players, ball and equipment moving
  through 1–12 animated phases. Coaches drag players, movement targets and the ball.
- **Telestrator:** pen, arrow, pass, dribble, zone, laser, sticky note and eraser tools drawn over the pitch.
- **AI drill designer:** describe a drill in text or by voice (English, Arabic or French speech input);
  the server asks Gemini for a draft, repairs and validates it, and the coach edits the result.
- **Playbook:** drills are saved on the server with ownership, version numbers and role-based visibility.
- **Fast changes:** one-click adjustments (+1 pressing defender, fullback overlap, mini-goals,
  cone grid, flip pitch view).

Principle: the tactical board is the product; AI output is a draft the coach owns and can override.

## 2. Architecture

```
Browser (React 19, canvas)                 Server (Express, Node 22)
───────────────────────────                ──────────────────────────────────────────────
App.tsx  ── fetch /api/* ────────────────► server.ts (routing, headers, generation flow)
  TacticalPitchView (canvas, pointer)        ├─ server/routes/authRoutes.ts     /api/auth/*
  VoicePromptSheet (Web Speech API)          ├─ server/routes/userRoutes.ts     /api/users/*   (SUPER_ADMIN)
  SuperAdminUserManager                      ├─ server/drills/drillRoutes.ts    /api/drills/*
  utils/drillCache.ts (per-user cache)       ├─ server/ai/geminiDrillGenerator.ts  → Gemini API
  utils/sessionToken.ts (iframe only)        ├─ server/tactical/  validator, repair, synthesizer, fast changes
                                             ├─ server/cache/     fingerprint + bounded generation cache
                                             ├─ server/security/  rate limiting, HTTP headers
                                             └─ server/storage/   atomic JSON files in DATA_DIR
```

In development, `server.ts` mounts Vite as middleware (this is how the AI Studio preview runs).
In production, it serves only `dist/client/`; the server bundle `dist/server.cjs` sits outside the
public directory.

### Key files

| Path | Purpose |
|---|---|
| `server/config.ts` | Every environment variable, parsed and defaulted in one place |
| `server/auth/userService.ts` | User store, bcrypt hashing, admin bootstrap, account policies |
| `server/auth/tokenService.ts` | JWT (HS256) signing/verification, secret resolution |
| `server/middleware/authMiddleware.ts` | `requireAuth`, `requireRole`, `requireSuperAdmin`, session revocation |
| `server/drills/drillService.ts` | Drill ownership, visibility, PLAYER read-only rule, per-user quota |
| `server/drills/drillRepository.ts` | In-memory and JSON-file repositories behind one interface |
| `server/tactical/tacticalValidator.ts` | Strict schema and size validation for every stored drill |
| `server/tactical/aiDrillRepair.ts` | Fixes mechanical defects in Gemini output before validation |
| `server/tactical/tacticalSynthesizer.ts` | Offline template engine (eco mode and fallback) |
| `server/tactical/fastChanges.ts` | Pure, idempotent fast-change transforms |
| `server/cache/cacheFingerprint.ts` | Canonical request fingerprint `drill-cache:v2:<sha256>` |
| `server/cache/drillCacheStore.ts` | Bounded LRU generation cache with per-source TTL |
| `server/ai/geminiDrillGenerator.ts` | Model fallback chain, timeout, structured output |

## 3. Tactical data model

Coordinates are normalized: `x` 0 = left touchline → 1 = right touchline; `y` 0 = the goal being
attacked (top) → 1 = own goal line (bottom).

| Entity | Fields and allowed values |
|---|---|
| Drill | `title`, `category`, `focusArea`, `durationMinutes` (1–240), `pitchView` `FULL`/`HALF`, `description`, `coachingCues[]`, `phases[]` |
| Phase | `step` (unique positive integer; phases are sorted by step), `title`, `instruction`, `durationSec` (>0, ≤60), `players[]`, `ball`, `equipment[]` |
| Player | `id` (unique within the phase), `number` 1–99, `role` `ATTACK`/`DEFENSE`/`GOALKEEPER`/`NEUTRAL`, `x`,`y`,`targetX`,`targetY` in [0,1], `label`, optional `hasBall`, `tacticalRole`, `tacticalDuty` |
| Ball | `x`,`y`,`targetX`,`targetY` in [0,1], `trajectory` `GROUND_PASS`/`AERIAL_PASS`/`DRIBBLE`/`SHOT` |
| Equipment | `id`, `type` `CONE`/`MINI_GOAL`/`MANNEQUIN`/`AGILITY_LADDER`, `x`,`y` in [0,1] |

Size limits (`TACTICAL_LIMITS`): 12 phases, 30 players and 40 equipment items per phase,
20 coaching cues, plus length limits on every text field.

## 4. Drill generation flow

`POST /api/generate-drill` (roles: SUPER_ADMIN, HEAD_COACH, ASSISTANT_COACH, CLIENT):

1. **Cache:** exact fingerprint match on prompt + formation + focus area + pitch view + mode.
   Sample prompts are pre-seeded with offline drills so demos are instant.
2. **Eco mode:** if requested, the offline synthesizer builds the drill (no API cost).
   Note: the generator sheet has eco mode switched **on** by default.
3. **Gemini:** models from `GEMINI_MODELS` are tried in order, 30 s timeout each, 8,192 output
   tokens, low thinking level. Output → `repairAiDrill` → `validateTacticalDrill`.
   Limited to 20 Gemini requests per user per 10 minutes.
4. **Fallback:** if no key is configured or every model fails, the offline engine is used and the
   response carries `isTacticalFallback: true` and a `fallbackReason`, which the UI shows to the coach.

Cache lifetimes: Gemini results 7 days, fallback results 10 minutes (so Gemini is retried once it
recovers), seeds and eco results indefinitely. The cache holds at most 500 entries (LRU).

The client also keeps a small per-user cache in `localStorage`, cleared on logout. Every generated
drill is saved to the server playbook.

## 5. Security model

### Authentication
- Passwords hashed with bcrypt (cost 11). Minimum 10 characters. No default passwords.
- Sessions are JWTs (HS256, 7 days) sent as an HttpOnly `SameSite=Lax` cookie, and also returned to
  the client for use as a Bearer token, because the AI Studio preview runs in a cross-site iframe
  where the cookie is not sent. When embedded, the token is kept in `sessionStorage` so a refresh
  does not log the user out; top-level visits never store it in JavaScript-readable storage.
- Every user has a `tokenVersion`. Changing a password or role increments it, which invalidates all
  existing sessions for that user. Deleting a user invalidates their sessions immediately.
- Signing secret: `AUTH_SECRET`, otherwise a random secret persisted in `DATA_DIR/.auth_secret`.
- The first `SUPER_ADMIN` is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD`; if no password is
  set, a random one is printed once to the server log.

### Authorization
- The server enforces all permissions; UI checks are cosmetic.
- User management is SUPER_ADMIN only. An admin cannot delete or demote themselves, and the last
  SUPER_ADMIN cannot be removed.
- Drills: owners and SUPER_ADMIN can modify; non-owners receive 404 (existence is not revealed).
  Clients never see system drills. PLAYER accounts are read-only.
- Server-assigned fields (`createdBy`, `version`, `createdAt`, `isSystem`, id) cannot be set by clients.

### Abuse protection
- Login: 20 attempts per IP and 8 failed attempts per username per 15 minutes.
- Gemini: 20 requests per user per 10 minutes. Fast changes: 60 per minute. Admin actions: 60 per minute.
- Request bodies up to 2 MB; validator size limits on all drill content; per-user limit of 300 drills.

### HTTP
- `X-Powered-By` removed; `nosniff`, `Referrer-Policy`, `Permissions-Policy` (microphone for self
  only) on every response; `Cache-Control: no-store` on API responses.
- Production adds a Content-Security-Policy (`script-src 'self'`, no inline scripts) and HSTS over HTTPS.
- Only `dist/client/` is served publicly.

### Known limitations
- **Storage is single-instance.** JSON files and in-memory rate limits assume one server process.
  Running several instances (e.g. Cloud Run autoscaling beyond 1) needs a shared database and
  a shared rate-limit store.
- **The AI Studio preview and Cloud Run have temporary disks.** Users and drills reset on restart
  unless a volume is mounted at `DATA_DIR`.
- **Updates are last-write-wins.** Two people editing the same drill can overwrite each other.
- **No self-service password change screen.** Super admins reset passwords (including their own)
  in Manage Users.
- **Telestrator drawings and sticky notes are not saved** with the drill.
- **Deleting a user leaves their drills in storage**, visible only to super admins.
- **Styles allow inline** (`style-src 'unsafe-inline'`) because React style props need it.
- **Frontend behaviour is verified by type checking and builds, not browser tests.** Animation,
  drag and voice changes should be checked manually after each release.
- System drills are defined twice (client sample data and server seed). Keep them in sync.

## 6. API summary

| Method & path | Access | Purpose |
|---|---|---|
| `POST /api/auth/login` | Public, rate limited | Sign in |
| `POST /api/auth/logout` | Public | Clear the session cookie |
| `GET /api/auth/me` | Signed in | Current user |
| `PUT /api/auth/me/email` | Signed in | Add email on first login |
| `GET/POST /api/users`, `PUT/DELETE /api/users/:id` | SUPER_ADMIN | User management |
| `GET/POST /api/drills`, `GET/PATCH/PUT/DELETE /api/drills/:id` | Signed in (writes: not PLAYER) | Playbook |
| `POST /api/drills/migrate` | Signed in (not PLAYER) | Import up to 100 legacy browser drills |
| `POST /api/generate-drill` | Not PLAYER | Generate a drill |
| `POST /api/fast-change` | Not PLAYER | Apply a fast change |
| `GET /api/cache-stats` | Signed in | Generation cache statistics |
| `POST /api/clear-cache` | SUPER_ADMIN | Reset the generation cache |
| `GET /api/health` | Public | Liveness (`status`, `version` only) |

## 7. Testing

`npm test` runs six suites, each in its own process with in-memory storage:

| Suite | Covers |
|---|---|
| `tacticalValidator.test.ts` | Validation rules and error codes |
| `drillPersistence.test.ts` | Ownership, visibility, anti-spoofing, migration |
| `planEditorIntegrity.test.ts` | Coach edits stay authoritative across phases and saves |
| `coachPlanEditorTutorial.test.ts` | Tutorial workflows against the real service |
| `cacheFingerprint.test.ts` | Canonicalization, client/server hash parity, cache behaviour |
| `securityHardening.test.ts` | Auth, sessions, roles, rate limits, headers, limits, AI repair, cache bounds (runs the real HTTP app) |

Test counts are printed by each suite; do not hard-code them in documentation.

## 8. Roadmap

All items below are **planned, not built**.

- Durable shared storage adapter (PostgreSQL self-hosted, or Firestore if staying on Cloud Run)
- Browser end-to-end tests (Playwright) for the board, drag and playback
- Self-service password change and email verification
- Save telestrator annotations and notes with drills; conflict detection on concurrent edits
- Drill library: filtering, search, tags, duplication
- Training session planner with printable/PDF export
- Team rosters and player tactical profiles
- Match-day mode and live multi-coach board sharing
