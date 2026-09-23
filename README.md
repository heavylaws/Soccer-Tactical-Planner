# CoachTactics — Soccer Tactical Planning Platform

CoachTactics is a soccer coaching, session management, and tactical planning platform designed around a core philosophy:
> **The Tactical Board is the central product experience. The AI is an assistant to the coach, never the owner of the tactical model.**

---

## Documentation

For the complete, comprehensive architectural report, technical roadmap, and implementation details of everything built across all phases:

📖 **Read the full master documentation:** [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md)

---

## Key Capabilities

1. **Tactical Board:** Interactive pitch canvas, player repositioning, movement handles, pass corridors, and multi-phase animation playback.
2. **AI Drill Designer:** High-level tactical prompt generation backed by the Gemini API, verified through a strict domain validation gatekeeper, with a $0-cost offline tactical synthesis engine fallback.
3. **Drill Persistence & Access Control:** Server-authoritative storage, anti-spoofing ownership verification, and role-based permissions (`SUPER_ADMIN`, `HEAD_COACH`, `ASSISTANT_COACH`, `CLIENT`, `PLAYER`).
4. **Deterministic Tactical Cache:** Versioned `drill-cache:v2:<sha256>` fingerprinting with exact semantic matching and zero quota waste.

---

## Test Verification

```bash
NODE_ENV=test npx tsx tests/tacticalValidator.test.ts
NODE_ENV=test npx tsx tests/drillPersistence.test.ts
NODE_ENV=test npx tsx tests/planEditorIntegrity.test.ts
NODE_ENV=test npx tsx tests/coachPlanEditorTutorial.test.ts
NODE_ENV=test npx tsx tests/cacheFingerprint.test.ts
```

*Status: 186/186 automated test assertions passing.*
