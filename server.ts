import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { GoogleGenAI, Type } from "@google/genai";
import { authRouter } from "./server/routes/authRoutes.ts";
import { userRouter } from "./server/routes/userRoutes.ts";
import { drillRouter } from "./server/drills/drillRoutes.ts";
import { requireAuth } from "./server/middleware/authMiddleware.ts";
import { validateTacticalDrill } from "./server/tactical/tacticalValidator.ts";
import { synthesizeTacticalDrill } from "./server/tactical/tacticalSynthesizer.ts";
import {
  generateCacheFingerprint,
  canonicalizeContext,
  TacticalGenerationContext,
  CanonicalGenerationContext,
  CACHE_VERSION,
} from "./server/cache/cacheFingerprint.ts";

dotenv.config();

// Deterministic In-Memory Tactical Drill Cache System (Versioned v2 Fingerprints)
export interface CachedDrillEntry {
  fingerprint: string;
  context: CanonicalGenerationContext;
  drill: any;
  createdAt: number;
  hits: number;
  source: "coachtactics-prewarmed" | "coachtactics-synthesized" | "gemini-cached";
}

export const drillCache = new Map<string, CachedDrillEntry>();

export const cacheMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  apiCalls: 0,
  quotaSaved: 0,
};

export function saveToDrillCache(
  context: TacticalGenerationContext,
  drill: any,
  source: CachedDrillEntry["source"]
): string {
  const valResult = validateTacticalDrill(drill);
  if (!valResult.success || !valResult.drill) {
    console.warn("[Cache] Cannot cache drill that fails tactical domain validation");
    return "";
  }

  const canonical = canonicalizeContext(context);
  const fingerprint = generateCacheFingerprint(canonical);

  drillCache.set(fingerprint, {
    fingerprint,
    context: canonical,
    drill: JSON.parse(JSON.stringify(valResult.drill)),
    createdAt: Date.now(),
    hits: 0,
    source,
  });

  return fingerprint;
}

export function findInDrillCache(context: TacticalGenerationContext): CachedDrillEntry | null {
  const fingerprint = generateCacheFingerprint(context);
  // EXACT deterministic key match only - NO fuzzy keyword/token overlap
  const entry = drillCache.get(fingerprint);
  if (!entry) return null;

  // Validate cached drill before serving to ensure domain consistency
  const valResult = validateTacticalDrill(entry.drill);
  if (!valResult.success || !valResult.drill) {
    console.warn(`[Cache] Evicting invalid cached drill: ${fingerprint}`);
    drillCache.delete(fingerprint);
    return null;
  }

  return entry;
}

export function prewarmCache() {
  drillCache.clear();
  const seeds = [
    {
      prompt: "3-phase counter attack with overlapping winger and low cutback cross",
      formation: "4-3-3",
      focusArea: "Attacking Transition",
    },
    {
      prompt: "High pressing trap on opponent #6 with 3-man angle convergence",
      formation: "4-3-3",
      focusArea: "High Press",
    },
    {
      prompt: "Pep Guardiola 3-2-5 box midfield build-up to isolate 1v1 winger",
      formation: "3-2-5",
      focusArea: "Positional Play",
    },
    {
      prompt: "Near-post decoy corner routine with late edge-of-box arrival",
      formation: "Set Piece",
      focusArea: "Set Piece",
    },
    {
      prompt: "Gegenpressing Midfield Trap & Vertical Break",
      formation: "4-3-3",
      focusArea: "Defensive Transitions",
    },
    {
      prompt: "Overlapping wing delivery and box attack",
      formation: "4-3-3",
      focusArea: "Attacking Patterns",
    },
    {
      prompt: "Rapid 4v3 counter-attack with decoy run pinning defender",
      formation: "4-3-3",
      focusArea: "Attacking Transition",
    },
    {
      prompt: "Third-man run combination through central channel to break low block",
      formation: "4-3-3",
      focusArea: "Positional Play",
    },
  ];

  for (const s of seeds) {
    const drill = synthesizeTacticalDrill(s.prompt, s.formation, s.focusArea, "FULL");
    const valResult = validateTacticalDrill(drill);
    if (valResult.success && valResult.drill) {
      saveToDrillCache(
        {
          prompt: s.prompt,
          formation: s.formation,
          focusArea: s.focusArea,
          pitchView: "FULL",
          ecoMode: false,
        },
        valResult.drill,
        "coachtactics-prewarmed"
      );
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize pre-warmed cache with CoachTactics drills
  prewarmCache();

  app.use(express.json());
  app.use(cookieParser());

  // Server Authentication & Identity Routes
  app.use("/api/auth", authRouter);

  // User Management Routes (Protected)
  app.use("/api/users", userRouter);

  // Tactical Drill Persistence & Ownership Routes (Protected)
  app.use("/api/drills", drillRouter);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      platform: "CoachTactics",
      version: "2.0.0",
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      cachedDrillsCount: drillCache.size,
    });
  });

  // Cache stats and quota preservation metrics
  app.get("/api/cache-stats", (_req, res) => {
    const hitRate = cacheMetrics.totalRequests > 0
      ? Math.round((cacheMetrics.cacheHits / cacheMetrics.totalRequests) * 100)
      : 100;

    res.json({
      totalRequests: cacheMetrics.totalRequests,
      cacheHits: cacheMetrics.cacheHits,
      apiCalls: cacheMetrics.apiCalls,
      quotaSaved: cacheMetrics.quotaSaved,
      hitRatePercent: hitRate,
      cachedDrillsCount: drillCache.size,
      cacheVersion: CACHE_VERSION,
    });
  });

  // Clear server cache (Protected)
  app.post("/api/clear-cache", requireAuth, (_req, res) => {
    drillCache.clear();
    prewarmCache();
    cacheMetrics.totalRequests = 0;
    cacheMetrics.cacheHits = 0;
    cacheMetrics.apiCalls = 0;
    cacheMetrics.quotaSaved = 0;
    res.json({
      success: true,
      message: "Tactical cache refreshed and re-seeded with v2 fingerprints.",
      cachedDrillsCount: drillCache.size,
      cacheVersion: CACHE_VERSION,
    });
  });

  // Generate Animated Tactical Drill with Cache-First Strategy (Protected)
  app.post("/api/generate-drill", requireAuth, async (req, res) => {
    const { prompt, currentFormation, focusArea, pitchView, forceRefresh, ecoMode } = req.body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Prompt is required to generate a tactical training drill.",
      });
    }

    const genContext: TacticalGenerationContext = {
      prompt,
      formation: currentFormation,
      focusArea,
      pitchView,
      ecoMode: !!ecoMode,
    };

    cacheMetrics.totalRequests++;

    // 1. Cache-First Check (Zero API Call, Instant 0ms Latency, Exact Deterministic Match)
    if (!forceRefresh) {
      const cached = findInDrillCache(genContext);
      if (cached) {
        cached.hits++;
        cacheMetrics.cacheHits++;
        cacheMetrics.quotaSaved++;
        return res.json({
          success: true,
          drill: {
            ...cached.drill,
            id: `drill_cached_${Date.now()}`,
            isCached: true,
            cacheSource: "server-memory",
            quotaSaved: true,
          },
          cached: true,
          cacheHits: cached.hits,
          quotaSaved: true,
          fingerprint: cached.fingerprint,
          message: "Loaded from Tactical Cache (0 API calls, $0 quota used).",
        });
      }
    }

    // 2. Eco / Free Mode Check (Synthesizes CoachTactics tactics locally at $0 cost)
    if (ecoMode) {
      const rawSynthesized = synthesizeTacticalDrill(prompt, currentFormation, focusArea, pitchView);
      const valResult = validateTacticalDrill(rawSynthesized);
      if (!valResult.success || !valResult.drill) {
        console.error("Eco mode synthesized drill validation failed:", valResult.errors);
        return res.status(422).json({
          success: false,
          error: "Tactical domain validation failed on synthesized drill.",
          details: valResult.errors,
        });
      }
      cacheMetrics.cacheHits++;
      cacheMetrics.quotaSaved++;
      const synthesized = valResult.drill;
      const cachedFp = saveToDrillCache(genContext, synthesized, "coachtactics-synthesized");
      return res.json({
        success: true,
        drill: {
          ...synthesized,
          id: `drill_eco_${Date.now()}`,
          isCached: true,
          cacheSource: "coachtactics-offline",
          quotaSaved: true,
        },
        cached: true,
        quotaSaved: true,
        ecoMode: true,
        fingerprint: cachedFp,
        message: "Generated via CoachTactics Tactical Engine ($0 API cost, quota preserved).",
      });
    }

    // 3. Live Gemini Generation (Using lowest token cost model: gemini-3.1-flash-lite)
    let drillData: any = null;

    // Supported modern Gemini models in fallback order:
    // gemini-3.1-flash-lite is the most cost-efficient, highest free-tier quota model
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
    ];

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are the Tactical AI Engine for CoachTactics (an elite soccer tactical animation board).
Generate dynamic, animated multi-phase soccer training drills.
Each drill MUST contain 3 to 4 sequential phases showing players moving smoothly from start positions to target positions.

Coordinates are normalized 0.0 to 1.0:
- x (width): 0.0 = left touchline, 0.5 = center, 1.0 = right touchline
- y (length): 0.0 = attacking goal/byline (top), 0.5 = midfield, 1.0 = defensive goal/byline (bottom)

For each player:
- role: 'ATTACK' (Cyan), 'DEFENSE' (Orange), 'GOALKEEPER' (Gold), or 'NEUTRAL'
- x, y: starting position in phase (0.05 to 0.95)
- targetX, targetY: ending position where player runs in this phase
- hasBall: boolean (true if player starts phase with the ball)
- label: short name or position (e.g. "CM #8", "RW #7", "CB #4", "Press #10")
- number: jersey number

For the ball:
- x, y: starting coordinate
- targetX, targetY: destination where ball is kicked/passed/shot
- trajectory: 'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT'

Equipment (optional):
- type: 'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER'
- x, y: coordinate`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Professional name of drill" },
          category: { type: Type.STRING, description: "Category (e.g., 'Attacking Patterns', 'Defensive Transitions')" },
          focusArea: { type: Type.STRING, description: "Specific tactical theme" },
          durationMinutes: { type: Type.INTEGER, description: "Recommended drill duration in minutes" },
          pitchView: { type: Type.STRING, description: "'FULL' or 'HALF'" },
          description: { type: Type.STRING, description: "Comprehensive tactical drill overview" },
          coachingCues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Coaching cues to emphasize during drill"
          },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.INTEGER },
                title: { type: Type.STRING, description: "Phase name (e.g., 'Phase 1: Build-Up & Trigger')" },
                instruction: { type: Type.STRING, description: "Tactical instruction for this animation phase" },
                durationSec: { type: Type.NUMBER, description: "Duration in seconds (typically 2.4 to 3.2)" },
                players: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      number: { type: Type.INTEGER },
                      role: { type: Type.STRING, description: "'ATTACK' | 'DEFENSE' | 'NEUTRAL' | 'GOALKEEPER'" },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      targetX: { type: Type.NUMBER },
                      targetY: { type: Type.NUMBER },
                      label: { type: Type.STRING },
                      hasBall: { type: Type.BOOLEAN }
                    },
                    required: ["id", "number", "role", "x", "y", "targetX", "targetY", "label"]
                  }
                },
                ball: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    targetX: { type: Type.NUMBER },
                    targetY: { type: Type.NUMBER },
                    trajectory: { type: Type.STRING, description: "'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT'" }
                  },
                  required: ["x", "y", "targetX", "targetY", "trajectory"]
                },
                equipment: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, description: "'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER'" },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    },
                    required: ["id", "type", "x", "y"]
                  }
                }
              },
              required: ["step", "title", "instruction", "durationSec", "players", "ball"]
            }
          }
        },
        required: ["title", "category", "focusArea", "durationMinutes", "pitchView", "description", "coachingCues", "phases"]
      };

      for (const modelName of candidateModels) {
        try {
          console.log(`Generating tactical animated drill using ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Generate an animated tactical drill for coach instructions: "${prompt}".
${currentFormation ? `Team Formation: ${currentFormation}.` : ""}
${focusArea ? `Focus Area: ${focusArea}.` : ""}
${pitchView ? `Preferred Pitch View: ${pitchView}.` : ""}
Ensure realistic player movements, passing trajectories, and 3 to 4 sequential phases.`,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema,
              maxOutputTokens: 2500,
            }
          });

          const rawText = response.text?.trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const validation = validateTacticalDrill(parsed);
            if (validation.success && validation.drill) {
              drillData = validation.drill;
              drillData.id = `drill_ai_${Date.now()}`;
              drillData.isCached = false;
              drillData.cacheSource = "gemini-fresh";
              drillData.quotaSaved = false;
              cacheMetrics.apiCalls++;
              // Save validated drill to server cache for future zero-cost hits
              saveToDrillCache(genContext, drillData, "gemini-cached");
              break;
            } else {
              console.warn(`Model ${modelName} output failed tactical domain validation:`, validation.errors);
            }
          }
        } catch (modelErr: any) {
          console.log(`Model ${modelName} unavailable, checking next candidate model...`);
          await new Promise((r) => setTimeout(r, 250));
        }
      }
    } catch (outerErr: any) {
      console.log("AI generation engaged fallback mode:", outerErr?.message);
    }

    if (drillData && drillData.phases && drillData.phases.length > 0) {
      return res.json({
        success: true,
        drill: drillData,
        isTacticalFallback: false,
        cached: false,
        quotaSaved: false,
      });
    }

    // High demand fallback (Overload, rate limit, 503, or network outage)
    cacheMetrics.quotaSaved++;
    const rawFallback = synthesizeTacticalDrill(prompt, currentFormation, focusArea, pitchView);
    const fallbackValidation = validateTacticalDrill(rawFallback);
    if (!fallbackValidation.success || !fallbackValidation.drill) {
      console.error("Fallback synthesized drill validation failed:", fallbackValidation.errors);
      return res.status(422).json({
        success: false,
        error: "Tactical domain validation failed on generated fallback drill.",
        details: fallbackValidation.errors,
      });
    }
    const synthesized = fallbackValidation.drill;
    saveToDrillCache(genContext, synthesized, "coachtactics-synthesized");
    return res.json({
      success: true,
      drill: {
        ...synthesized,
        id: `drill_synth_${Date.now()}`,
        isCached: true,
        cacheSource: "coachtactics-offline",
        quotaSaved: true,
      },
      isTacticalFallback: true,
      cached: false,
      quotaSaved: true,
      note: "Drill synthesized with CoachTactics tactical principles ($0 API cost).",
    });
  });

  // Fast Tactical Adjustments (Protected)
  app.post("/api/fast-change", requireAuth, (req, res) => {
    const { drill, changeType } = req.body || {};
    if (!drill) {
      return res.status(400).json({ error: "Active drill is required" });
    }

    const updatedDrill = JSON.parse(JSON.stringify(drill));
    updatedDrill.coachingCues = updatedDrill.coachingCues || [];
    updatedDrill.phases = updatedDrill.phases || [];

    if (changeType === "+1 Defender Press") {
      // Add a pressing defender to each phase near the ball
      updatedDrill.phases.forEach((phase: any, idx: number) => {
        const presserId = "press_def_extra";
        const bx = phase.ball.x;
        const by = phase.ball.y;
        const exists = phase.players.find((p: any) => p.id === presserId);
        if (!exists) {
          phase.players.push({
            id: presserId,
            number: 99,
            role: "DEFENSE",
            x: Math.min(0.9, Math.max(0.1, bx + (idx % 2 === 0 ? 0.08 : -0.08))),
            y: Math.min(0.9, Math.max(0.1, by - 0.08)),
            targetX: bx,
            targetY: by,
            label: "Press #99",
          });
        }
      });
      updatedDrill.coachingCues.push("Apply immediate direct pressure on ball receiver");
    } else if (changeType === "Fullback Overlap") {
      updatedDrill.phases.forEach((phase: any) => {
        const rb = phase.players.find((p: any) => p.label?.includes("RB") || p.label?.includes("#2"));
        if (rb) {
          rb.targetX = 0.92;
          rb.targetY = Math.max(0.15, rb.targetY - 0.15);
        }
      });
    } else if (changeType === "Add 2 Mini-Goals") {
      updatedDrill.phases.forEach((phase: any) => {
        phase.equipment = phase.equipment || [];
        phase.equipment.push(
          { id: `goal_1_${Date.now()}`, type: "MINI_GOAL", x: 0.25, y: 0.90 },
          { id: `goal_2_${Date.now()}`, type: "MINI_GOAL", x: 0.75, y: 0.90 }
        );
      });
    } else if (changeType === "Add Cones & Grid") {
      updatedDrill.phases.forEach((phase: any) => {
        phase.equipment = phase.equipment || [];
        phase.equipment.push(
          { id: `cone_tl_${Date.now()}`, type: "CONE", x: 0.25, y: 0.30 },
          { id: `cone_tr_${Date.now()}`, type: "CONE", x: 0.75, y: 0.30 },
          { id: `cone_bl_${Date.now()}`, type: "CONE", x: 0.25, y: 0.70 },
          { id: `cone_br_${Date.now()}`, type: "CONE", x: 0.75, y: 0.70 }
        );
      });
    } else if (changeType === "Flip Pitch View") {
      updatedDrill.pitchView = updatedDrill.pitchView === "HALF" ? "FULL" : "HALF";
    }

    // Validate the modified tactical drill through the canonical validator
    const valResult = validateTacticalDrill(updatedDrill);
    if (!valResult.success || !valResult.drill) {
      return res.status(422).json({
        success: false,
        error: "Tactical domain validation failed on adjusted drill.",
        details: valResult.errors,
      });
    }

    return res.json({ success: true, drill: valResult.drill });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
        watch: isHmrDisabled ? null : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CoachTactics Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("Failed to start CoachTactics server:", err);
    process.exit(1);
  });
}
