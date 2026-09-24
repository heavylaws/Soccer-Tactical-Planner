# Changelog

All notable changes to CoachTactics. Newest first.

## Unreleased

### Build
- **Cross-platform build.** `build`, `start` and `clean` used Unix-only `rm -rf` and
  `NODE_ENV=production`, so they failed on Windows. `npm run build` now runs `scripts/build.mjs`
  (removes `dist/`, Vite client build to `dist/client/`, esbuild server bundle to `dist/server.cjs`).
  The bundle defines `process.env.NODE_ENV` as `"production"` and also sets it at startup, so
  Express (external, not bundled) runs in production mode and `npm start` is plain
  `node dist/server.cjs` on every platform.
  _Files: `scripts/build.mjs` (new), `package.json`_
- Removed the `@types/bcryptjs` stub (bcryptjs 3 ships its own types). Both lockfiles updated; the
  lockfiles also now carry the real package name (`coachtactics`) instead of `react-example`.
  _Files: `package.json`, `package-lock.json`, `bun.lock`_

### AI generation UI
- **Eco mode is now off by default** in the generator sheet: Gemini is used unless the coach
  switches eco mode on. Server-side limits, caching and fallback labelling are unchanged.
  The toggle now exposes `role="switch"` and `aria-checked`.
  _File: `src/components/VoicePromptSheet.tsx`_
- Removed hardcoded model names ("Gemini 3.1 Flash-Lite") from the UI; models come from
  `GEMINI_MODELS` (AGENTS.md section 6). Removed "UEFA" wording (no affiliation exists) and an
  inaccurate claim that differently worded prompts share a cache entry (matching is exact).
  The cached-drills tile shows "—" instead of a made-up 8 while statistics load.
  _Files: `src/components/VoicePromptSheet.tsx`, `src/components/QuotaStatsModal.tsx`, `src/App.tsx`_

## 2.1.0 — 2026-09-23 — Security hardening and reliability

### Security (fix before any real users)
- **Removed hardcoded credentials.** The super-admin password and demo passwords were in
  `server/auth/userService.ts` and printed on the login page as "quick access" buttons. The first
  admin is now created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (or a one-time random password in
  the server log). Demo accounts named after real people were removed.
  _Files: `server/auth/userService.ts`, `src/components/LoginModal.tsx`, `src/data/sampleTactics.ts`_
- **Production no longer serves the server bundle.** `dist/server.cjs` and its source map
  (containing all server source) were publicly downloadable. Client builds now go to `dist/client/`,
  which is the only public directory. _Files: `vite.config.ts`, `server.ts`, `package.json`_
- **Login rate limiting**: 20 attempts per IP and 8 failures per username per 15 minutes.
  Unknown usernames take the same time and get the same message as wrong passwords.
- **Session revocation**: password or role changes invalidate existing sessions. The signing
  secret persists across restarts (previously every restart logged everyone out). JWT algorithm pinned to HS256.
- **Server-side role enforcement**: PLAYER is now read-only on the server (was UI-only), including
  AI generation. Clearing the AI cache requires SUPER_ADMIN; cache statistics require login;
  the public health endpoint no longer reveals configuration.
- **Account policies**: 10-character minimum password, no default passwords, validated roles and
  usernames, cannot delete or demote yourself, last super admin cannot be removed (was protected by
  username only, so renaming it bypassed the check).
- **Removed the client-side role switcher**, which let any user make the UI claim any role.
  The dialog now shows the signed-in account only. _File: `src/components/RoleManagementDialog.tsx`_
- **Size limits** on drills (phases, players, equipment, text lengths), request bodies (2 MB),
  prompts (1,000 chars), drills per user (300) and validation error payloads.
- **HTTP headers**: CSP in production, nosniff, referrer and permissions policies, no-store on API,
  `X-Powered-By` removed. The inline script in `index.html` moved to `src/main.tsx` (dev only) so
  the CSP can forbid inline scripts.
- **Per-user browser cache**: cached drills were shared by everyone using the same browser.
  Keys now include the user id and are cleared on logout. _File: `src/utils/drillCache.ts`_

### AI generation
- Output budget raised from 2,500 to 8,192 tokens (was truncating 3–4 phase drills), low thinking
  level, 30-second timeout, one reused SDK client, real error logging.
- New repair step fixes mechanical model mistakes (out-of-range or percentage coordinates,
  duplicate ids, role/trajectory synonyms, phase numbering) before strict validation.
  _File: `server/tactical/aiDrillRepair.ts`_
- Models configurable via `GEMINI_MODELS`; default `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`,
  `gemini-3.8-flash`. Structured output schema now uses enums.
- Fallback results are labelled as fallback in the UI with the reason (no key / Gemini unavailable),
  and cached for only 10 minutes. Previously an outage cached the template permanently under the
  Gemini key. The generation cache is now capped (500 entries, LRU).
- Per-user limit of 20 Gemini requests per 10 minutes (cache hits and eco mode are free).

### Tactical board and UI
- Fixed phases skipping two at a time in the AI Studio preview (setState inside a setState updater,
  run twice by React StrictMode). The app also no longer re-renders every frame while paused.
- Fixed laser pointer dots never expiring (timestamp clock mismatch).
- Pitch input uses Pointer Events with pointer capture: drags no longer stick when the pointer
  leaves the pitch; players and the ball can be grabbed where they are drawn during playback;
  dragging pauses playback; the canvas redraws on resize/rotation.
- Voice input: the stop button now stops listening; the microphone is released when the sheet
  closes; unsupported browsers get a clear message instead of a fake recording with a canned
  prompt; speech language selectable (English, Arabic, French); the prompt box supports RTL text.
- Fast changes: "Fullback Overlap" no longer moves players #20–#29; equipment buttons no longer
  stack duplicates on repeated clicks; unknown changes are rejected; the UI shows the result message.
- Admin user manager: password generator, 10-character minimum, own role cannot be changed.
- In the AI Studio preview (iframe), the session survives a page refresh (token kept in sessionStorage).

### Persistence and operations
- Users and drills persist to JSON files in `DATA_DIR` (atomic writes, owner-only permissions,
  flushed on shutdown). Previously everything was lost on restart.
- `ADMIN_RESET_PASSWORD` one-shot recovery for self-hosted installs.
- Added `Dockerfile` and `docker-compose.yml` (non-root, read-only filesystem, localhost-only port).
- Fixed `npm install` failing (esbuild version conflict with Vite 8). `bun.lock` regenerated.
- Added `npm test` (all suites) and `npm run check` (lint + test + build).

### Documentation
- Rewrote `README.md` and `PROJECT_DOCUMENTATION.md` to match the code. The previous version
  described features that do not exist (PBKDF2 hashing, a refresh endpoint, export utilities,
  persistent storage, tagging, rosters) and wrong enum values.
- Added `AGENTS.md` with rules for AI coding agents, and `.gemini/GEMINI.md` pointing to it.

### Tests
- New `tests/securityHardening.test.ts` exercising the real HTTP app: credentials scan, login and
  enumeration, password policy, session revocation, admin safety rails, PLAYER read-only, cache
  endpoint access, fallback labelling, headers, rate limiting, validator limits, AI repair,
  fast changes and cache bounds. All pre-existing suites unchanged and passing.

## 2.0.0 — Server-side authentication
- Initial server-side auth, drill persistence API, validator and cache fingerprinting (see git history).
