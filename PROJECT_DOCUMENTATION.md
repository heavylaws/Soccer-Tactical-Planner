# CoachTactics — Master Project Documentation

> **Status:** Production-Grade Soccer Tactical Planning Platform  
> **Repository Baseline:** Full-Stack TypeScript (React SPA + Express Node.js Server)  
> **Automated Test Suites:** 186/186 Tests Passing (100% Pass Rate)  
> **Build & Lint Status:** Clean compilation (`tsc --noEmit`, Vite build verified)

---

## 1. Executive Summary & Vision

**CoachTactics** is an advanced soccer coaching, session management, and tactical planning platform. It bridges the gap between high-level tactical coaching methodology and interactive digital pitch simulation.

The product centers on a fundamental engineering philosophy:
> **The Tactical Board is the core product experience. The AI is an assistant to the coach, never the owner of the tactical model.**

Every tactical plan generated or designed within CoachTactics is fully inspectable, editable, replayable, and exportable. The coach has absolute authority over player positioning, movement vectors, ball corridors, and phase choreography.

### The Four Connected Capabilities

```
┌──────────────────────────────────────────────────────────────┐
│                    COACHTACTICS PLATFORM                     │
├──────────────────────────────┬───────────────────────────────┤
│ 1. Tactical Board            │ 2. AI Drill Designer          │
│    Interactive pitch canvas, │    Generates animations from  │
│    telestrator, phase player │    natural language; strict   │
│    and animation playback.   │    domain validation gate.    │
├──────────────────────────────┼───────────────────────────────┤
│ 3. Drill & Playbook Manager  │ 4. Team & Player Management   │
│    Server-persisted library, │    Rosters, player roles,     │
│    version control, tagging, │    tactical profiles, and     │
│    and session organization. │    individual assignments.    │
└──────────────────────────────┴───────────────────────────────┘
```

---

## 2. Core Architectural Principles

1. **The Backend Is the Authority:**
   The browser is an untrusted client environment. Client-side checks exist purely for user experience (UX) and are never used as security boundaries. Authentication, role verification, data ownership, versioning, and mutation authorizations are strictly evaluated and enforced by the Express backend.

2. **AI Output Is Untrusted Input:**
   Outputs from Large Language Models (Gemini API) are never injected directly into application state. All generative model outputs pass through a deterministic validation, normalization, and domain-constraint pipeline before touching the tactical board.

3. **Coach Edit Absolute Authority (Single Source of Truth):**
   When a coach adjusts player coordinates, drag-handles, or pass trajectories in the Plan Editor, those manual edits immediately become the authoritative tactical model. Subsequent playback, exports, and transformations respect the coach's edits over any prior AI base template.

4. **Deterministic Versioned Caching:**
   Tactical generation requests use deterministic canonicalization and versioned SHA-256 fingerprinting (`drill-cache:v2:<hash>`). Inaccurate fuzzy keyword matches and token overlaps are completely eliminated to prevent false cache hits.

5. **Desktop & Mobile Parity:**
   Every feature—including player dragging, trajectory handles, telestrator drawing, timeline playback, and modal dialogs—is built to function reliably on desktop mouse, tablet styluses, and mobile touchscreens.

---

## 3. Technology Stack & Directory Structure

* **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas/SVG hybrid rendering.
* **Backend:** Node.js (v22), Express, TypeScript (`tsx`), JWT/HMAC token authentication, PBKDF2 cryptographic hashing.
* **AI Integration:** Google Gemini API (`@google/genai`) with offline fallback via the CoachTactics Tactical Synthesis Engine.
* **Build System:** Vite, ES modules, TypeScript compilation verification (`compile_applet`), strict linting (`tsc --noEmit`).

### Project Directory Layout

```
├── server/
│   ├── auth/                     # Authentication & User services
│   │   ├── tokenService.ts       # HMAC-SHA256 bearer token signing & verification
│   │   └── userService.ts        # PBKDF2 salt/hash user store & credential verification
│   ├── cache/                    # Deterministic tactical caching
│   │   └── cacheFingerprint.ts   # Canonicalization & SHA-256 fingerprint generator
│   ├── drills/                   # Authoritative Drill persistence & domain logic
│   │   ├── drillDomain.ts        # Drill entity definitions, creation & update schemas
│   │   ├── drillRepository.ts    # In-memory & persistent drill repository with system presets
│   │   ├── drillRoutes.ts        # REST endpoints (GET, POST, PATCH, DELETE /api/drills)
│   │   └── drillService.ts       # Ownership, RBAC, and validation enforcement service
│   ├── middleware/
│   │   └── authMiddleware.ts     # Express middleware extracting and validating Bearer tokens
│   ├── routes/
│   │   ├── authRoutes.ts         # /api/auth/login, /api/auth/me, /api/auth/refresh
│   │   └── userRoutes.ts         # /api/users (Super Admin user administration)
│   └── tactical/                 # Tactical domain validation & offline synthesis
│       ├── tacticalDomain.ts     # Tactical validation interfaces, error codes, and bounds
│       ├── tacticalSynthesizer.ts# Offline tactical drill generator ($0 API cost)
│       └── tacticalValidator.ts  # Validation gatekeeper for coordinates, players, phases
├── src/
│   ├── components/               # React UI components
│   │   ├── TacticalPitchView.tsx # Interactive soccer pitch canvas & playback animator
│   │   ├── TelestratorToolbar.tsx# Drawing tools (arrows, passes, cones, lines)
│   │   ├── TimelinePlayerControls.tsx # Scrubbing, play/pause, speed controls
│   │   ├── PlaybookDrawer.tsx    # Saved drills library and playbook drawer
│   │   ├── CoachPlanEditorTutorialModal.tsx # Interactive 10-step coach onboarding tutorial
│   │   ├── QuotaStatsModal.tsx   # Cache hits, quota preservation, and hit rate monitor
│   │   └── ...                   # Role management, drill details, overlays
│   ├── utils/                    # Client-side utility functions
│   │   ├── cacheFingerprint.ts   # Pure-TS isomorphic SHA-256 fingerprinting for client cache
│   │   ├── drillCache.ts         # Client-side deterministic cache storage & retrieval
│   │   └── exportUtils.ts        # Tactical plan JSON/image exports
│   ├── types.ts                  # Shared TypeScript types and tactical interfaces
│   └── App.tsx                   # Main tactical workbench application container
├── tests/                        # Comprehensive automated test suites (186 tests)
│   ├── cacheFingerprint.test.ts  # Phase 5: Cache canonicalization & fingerprint parity
│   ├── coachPlanEditorTutorial.test.ts # Phase 4.6: Coach tutorial scenario tests
│   ├── drillPersistence.test.ts  # Phase 4: Server-authoritative drill persistence & RBAC
│   ├── planEditorIntegrity.test.ts # Phase 4.5: Plan editor single source of truth tests
│   └── tacticalValidator.test.ts # Phase 3: Tactical coordinate & phase validation tests
├── server.ts                     # Main Express backend server & API entry point
└── package.json                  # Dependencies, scripts, and build configuration
```

---

## 4. Comprehensive Changelog & Completed Phases

### Phase 1: Security Audit, Access Control Hardening & Baseline Stabilization
* **PBKDF2 Password Hashing:** Eliminated insecure plaintext passwords. Implemented standard PBKDF2 with SHA-512, 100,000 iterations, and cryptographically secure random 16-byte salt generation.
* **HMAC-SHA256 Token Service:** Built server-authoritative token signing (`tokenService.ts`) with tamper resistance and configurable session lifetimes.
* **Centralized RBAC Model:** Defined 5 distinct roles:
  * `SUPER_ADMIN`: Complete system access, user administration, global drill management.
  * `HEAD_COACH`: Creation, editing, tactical synthesis, playback, session organization.
  * `ASSISTANT_COACH`: Drill creation, execution, and viewing.
  * `CLIENT`: Restricted read/training access to assigned drills; clean dashboard without unauthorized system data.
  * `PLAYER`: Read-only view of relevant training assignments.
* **Neutral Brand Nomenclature:** Replaced unauthorized claims (e.g. "UEFA AI") with authorized terms: *CoachTactics Tactical Engine* and *CoachTactics Tactical Synthesis Engine*.

### Phase 2: Backend Architecture Separation
* **Modular Routing:** Extracted routing logic from the monolithic server file into modular controllers: `server/routes/authRoutes.ts`, `server/routes/userRoutes.ts`, and `server/drills/drillRoutes.ts`.
* **Express Middleware:** Implemented `requireAuth` and role-guard middleware to inspect `Authorization: Bearer <token>` headers before invoking protected handlers.
* **Safe Error Handling:** Prevented internal stack traces, API keys, or system-level exceptions from leaking to client responses.

### Phase 3: Tactical Domain Validation Gatekeeper
* **Strict Pitch Geometry:** Enforced pitch coordinate normalization:
  * X coordinates: `[0.0, 1.0]` (Left to Right / Touchline to Touchline).
  * Y coordinates: `[0.0, 1.0]` (Top to Bottom / Goal line to Goal line).
* **Player & Entity Integrity:**
  * Minimum player counts validated.
  * Required unique player numbers (e.g. #1 through #11).
  * Team assignments (`ATTACKING`, `DEFENDING`, `NEUTRAL`).
  * Movement trajectory types: `STRAIGHT`, `CURVED`, `DIAGONAL`, `OVERLAP`, `RUN_BEHIND`.
* **Phase & Chronology Validation:**
  * Mandatory chronological phase order (Phase 1, Phase 2, Phase 3...).
  * Phase durations constrained between `1.0s` and `30.0s`.
  * Ball movement types validated: `GROUND_PASS`, `HIGH_PASS`, `SHOT`, `DRIBBLE`, `LOOSE`.
* **Equipment Bounds:** Cones, mannequins, mini goals, and hurdles validated against pitch boundaries.
* **Test Verification:** 48/48 tests passing in `tests/tacticalValidator.test.ts`.

### Phase 4: Server-Authoritative Drill Persistence & Multi-Role Visibility
* **Full RESTful Resource Lifecycle:** Implemented endpoints for drill persistence:
  * `POST /api/drills` (Create new drill)
  * `GET /api/drills` (List drills based on authenticated user role)
  * `GET /api/drills/:id` (Get drill details)
  * `PATCH /api/drills/:id` (Update drill with server version increments)
  * `DELETE /api/drills/:id` (Delete drill)
* **Anti-Spoofing Architecture:**
  * The server rejects client-supplied `createdBy`, `createdByRole`, `version`, `createdAt`, or `isSystem` attributes.
  * Identity is bound strictly to the verified server session.
* **Role-Based Visibility & Resource Hiding:**
  * `CLIENT` users receive only their own drills (starting with a clean zero-state dashboard).
  * Coaches see system presets plus their own saved drills.
  * Non-owners receive HTTP 404 (Not Found) rather than revealing the existence of other users' drills.
* **Test Verification:** 41/41 tests passing in `tests/drillPersistence.test.ts`.

### Phase 4.5: Plan Editor Tactical Model Integrity (Single Source of Truth)
* **Elimination of Base-Plan Overwrite Bug:** Resolved an issue where manual coordinate adjustments made in the Plan Editor were reverted during playback or overshadowed by stale AI templates.
* **Start vs. Destination Separation:** Player starting positions (`x`, `y`) and movement destinations (`targetX`, `targetY`) are cleanly separated and tracked individually.
* **Authoritative Interpolation:** Canvas animation playback interpolates directly from coach-edited coordinates.
* **Phase Isolation:** Modifying positions or trajectories in Phase 1 does not inadvertently mutate Phase 2 or Phase 3.
* **Test Verification:** 25/25 tests passing in `tests/planEditorIntegrity.test.ts`.

### Phase 4.6: Coach Plan Editor Tutorial & Onboarding
* **Interactive 10-Step Coaching Workflow:** Added an in-app visual modal guide (`CoachPlanEditorTutorialModal.tsx`) explaining:
  1. Manual Plan Creation.
  2. Player Starting Repositioning.
  3. Movement Destination Handles.
  4. Movement Arrow Tool.
  5. PASS Tool & Ball Corridors.
  6. Phase Management & Multi-Phase Drills.
  7. Playback Preview & Trajectory Animation.
  8. Saving & Server Version Control.
  9. Modifying AI-Generated Drills (Coach Override Rule).
  10. Full Coaching Scenario Integration.
* **Test Verification:** 28/28 tests passing in `tests/coachPlanEditorTutorial.test.ts`.

### Phase 5: Deterministic Tactical Cache & Fingerprinting
* **Versioned Fingerprint Identity:** Implemented `drill-cache:v2:<sha256-hex>`.
* **Canonicalization Engine:**
  * Whitespace collapse, lowercase normalization, and formation notation unification (e.g. `"4 - 3 - 3"` becomes `"4-3-3"`).
  * Pitch perspective isolation (`FULL` vs `HALF`).
  * Engine mode isolation (`gemini` vs `eco`).
* **Tactical Semantics Preservation:**
  * Word order is strictly preserved (e.g., `"CB pass to pivot"` does not collide with `"pivot pass to CB"`).
  * Tactical prepositions (`behind`, `into`, `between`, `under`) are retained.
* **Elimination of Fuzzy Collisions:** Removed legacy 70%/80% token overlap logic. Cache queries require exact fingerprint matching.
* **Validation Gatekeeper:** Unvalidated drills cannot be saved to the cache. Corrupted cache entries are automatically evicted upon retrieval.
* **Cache vs Repository Separation:** AI generation cache (generic starting templates) and the coach's authoritative `DrillRepository` (custom edited drills) are decoupled.
* **Test Verification:** 44/44 tests passing in `tests/cacheFingerprint.test.ts`.

---

## 5. Verification & Test Coverage Summary

The system is continuously verified across 5 specialized test suites:

| Test Suite File | Focus Area | Assertions | Status |
| :--- | :--- | :---: | :---: |
| `tests/tacticalValidator.test.ts` | Tactical domain coordinates, phases, players, and equipment | 48 | **PASS** |
| `tests/drillPersistence.test.ts` | Server persistence, anti-spoofing, and multi-role RBAC | 41 | **PASS** |
| `tests/planEditorIntegrity.test.ts`| Plan Editor single source of truth & playback interpolation | 25 | **PASS** |
| `tests/coachPlanEditorTutorial.test.ts` | 10-step manual and AI coaching workflows | 28 | **PASS** |
| `tests/cacheFingerprint.test.ts` | Canonicalization, SHA-256 parity, and cache isolation | 44 | **PASS** |
| **TOTAL** | **Full System Integration & Unit Testing** | **186** | **100% PASS** |

### Verification Commands

To run all automated test suites:
```bash
NODE_ENV=test npx tsx tests/tacticalValidator.test.ts
NODE_ENV=test npx tsx tests/drillPersistence.test.ts
NODE_ENV=test npx tsx tests/planEditorIntegrity.test.ts
NODE_ENV=test npx tsx tests/coachPlanEditorTutorial.test.ts
NODE_ENV=test npx tsx tests/cacheFingerprint.test.ts
```

To verify TypeScript and bundle compilation:
```bash
npm run lint          # Validates types via tsc --noEmit
npm run build         # Validates Vite production bundle
```

---

## 6. Ongoing Roadmap & Next Phases

With core security, domain validation, persistence, plan editor integrity, and caching complete, development proceeds along the strategic roadmap:

```
[COMPLETED] Phase 1: Security & Identity Hardening
[COMPLETED] Phase 2: Backend Architecture & Router Extraction
[COMPLETED] Phase 3: Tactical Domain Validation Engine
[COMPLETED] Phase 4: Server-Authoritative Drill Persistence & RBAC
[COMPLETED] Phase 4.5: Plan Editor Integrity & Single Source of Truth
[COMPLETED] Phase 4.6: Coach Plan Editor Tutorial
[COMPLETED] Phase 5: Deterministic Tactical Cache & Fingerprinting
      │
      ▼
[CURRENT]   Phase 6: Drill Library & Playbook Management
            - Advanced drill filtering (categories, focus areas, formations)
            - Playbook grouping and drill duplication/forking
            - Drill search and tactical tagging
      │
      ▼
[UPCOMING]  Phase 7: Training Session Planner
            - Drag-and-drop session builder (Warm-up, Technical, Tactical, Match play)
            - Total session duration and physical load calculations
            - Printable/PDF session plan exports
      │
      ▼
[UPCOMING]  Phase 8: Team & Player Tactical Profiles
            - Squad roster management with jersey numbers and primary positions
            - Player-specific tactical notes and role instructions
            - Assigning players to drills on the tactical board
      │
      ▼
[UPCOMING]  Phase 9: Production Hardening & Real-Time Match Day Mode
            - Persistent database adapter integration (PostgreSQL / Firestore)
            - Tablet-optimized match-day quick tactical adjustments
            - Multi-coach live board sharing
```

---
*Document maintained by the CoachTactics Senior Engineering & Tactical Architecture Team.*
