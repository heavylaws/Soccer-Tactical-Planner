// CoachTactics — bounded, TTL-aware generation cache (exact fingerprint match only).
//
// Fixes vs. v2.0.0:
//  - Size cap with LRU eviction (was unbounded: every unique prompt grew memory forever).
//  - TTL per source. Offline fallback results produced during a Gemini outage now expire after
//    10 minutes instead of being served forever under the Gemini cache key.

import { validateTacticalDrill } from '../tactical/tacticalValidator.ts';
import { synthesizeTacticalDrill } from '../tactical/tacticalSynthesizer.ts';
import {
  generateCacheFingerprint,
  canonicalizeContext,
  TacticalGenerationContext,
  CanonicalGenerationContext,
} from './cacheFingerprint.ts';
import { config } from '../config.ts';

export type CacheSource = 'coachtactics-prewarmed' | 'coachtactics-synthesized' | 'coachtactics-fallback' | 'gemini-cached';

export interface CachedDrillEntry {
  fingerprint: string;
  context: CanonicalGenerationContext;
  drill: any;
  createdAt: number;
  hits: number;
  source: CacheSource | string;
  /** Epoch ms after which the entry is ignored. Undefined/null = never expires. */
  expiresAt?: number | null;
}

export const CACHE_TTL_MS: Record<CacheSource, number | null> = {
  'coachtactics-prewarmed': null,
  'coachtactics-synthesized': null, // eco mode is deterministic, no reason to expire
  'coachtactics-fallback': 10 * 60 * 1000,
  'gemini-cached': 7 * 24 * 60 * 60 * 1000,
};

export const drillCache = new Map<string, CachedDrillEntry>();

export const cacheMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  apiCalls: 0,
  quotaSaved: 0,
  fallbacks: 0,
};

function evictIfNeeded(): void {
  if (drillCache.size <= config.maxCachedDrills) return;
  for (const [key, entry] of drillCache) {
    if (drillCache.size <= config.maxCachedDrills) break;
    if (entry.source === 'coachtactics-prewarmed') continue;
    drillCache.delete(key);
  }
}

export function saveToDrillCache(
  context: TacticalGenerationContext,
  drill: any,
  source: CacheSource,
  ttlMs: number | null = CACHE_TTL_MS[source] ?? null
): string {
  const valResult = validateTacticalDrill(drill);
  if (!valResult.success || !valResult.drill) {
    console.warn('[Cache] Refusing to cache a drill that fails tactical validation');
    return '';
  }

  const canonical = canonicalizeContext(context);
  const fingerprint = generateCacheFingerprint(canonical);
  const now = Date.now();

  drillCache.delete(fingerprint); // re-insert at the MRU end
  drillCache.set(fingerprint, {
    fingerprint,
    context: canonical,
    drill: JSON.parse(JSON.stringify(valResult.drill)),
    createdAt: now,
    hits: 0,
    source,
    expiresAt: ttlMs === null ? null : now + ttlMs,
  });
  evictIfNeeded();
  return fingerprint;
}

export function findInDrillCache(context: TacticalGenerationContext): CachedDrillEntry | null {
  const fingerprint = generateCacheFingerprint(context);
  const entry = drillCache.get(fingerprint);
  if (!entry) return null;

  if (typeof entry.expiresAt === 'number' && entry.expiresAt <= Date.now()) {
    drillCache.delete(fingerprint);
    return null;
  }

  const valResult = validateTacticalDrill(entry.drill);
  if (!valResult.success || !valResult.drill) {
    console.warn(`[Cache] Evicting invalid cached drill: ${fingerprint}`);
    drillCache.delete(fingerprint);
    return null;
  }

  // LRU touch
  drillCache.delete(fingerprint);
  drillCache.set(fingerprint, entry);
  return entry;
}

const PREWARM_SEEDS = [
  { prompt: '3-phase counter attack with overlapping winger and low cutback cross', formation: '4-3-3', focusArea: 'Attacking Transition' },
  { prompt: 'High pressing trap on opponent #6 with 3-man angle convergence', formation: '4-3-3', focusArea: 'High Press' },
  { prompt: 'Pep Guardiola 3-2-5 box midfield build-up to isolate 1v1 winger', formation: '3-2-5', focusArea: 'Positional Play' },
  { prompt: 'Near-post decoy corner routine with late edge-of-box arrival', formation: 'Set Piece', focusArea: 'Set Piece' },
  { prompt: 'Gegenpressing Midfield Trap & Vertical Break', formation: '4-3-3', focusArea: 'Defensive Transitions' },
  { prompt: 'Overlapping wing delivery and box attack', formation: '4-3-3', focusArea: 'Attacking Patterns' },
  { prompt: 'Rapid 4v3 counter-attack with decoy run pinning defender', formation: '4-3-3', focusArea: 'Attacking Transition' },
  { prompt: 'Third-man run combination through central channel to break low block', formation: '4-3-3', focusArea: 'Positional Play' },
];

/** Seeds the sample prompts shown in the UI so demos are instant and cost nothing. */
export function prewarmCache(): void {
  drillCache.clear();
  for (const s of PREWARM_SEEDS) {
    const drill = synthesizeTacticalDrill(s.prompt, s.formation, s.focusArea, 'FULL');
    saveToDrillCache(
      { prompt: s.prompt, formation: s.formation, focusArea: s.focusArea, pitchView: 'FULL', ecoMode: false },
      drill,
      'coachtactics-prewarmed'
    );
  }
}

export function resetCacheMetrics(): void {
  cacheMetrics.totalRequests = 0;
  cacheMetrics.cacheHits = 0;
  cacheMetrics.apiCalls = 0;
  cacheMetrics.quotaSaved = 0;
  cacheMetrics.fallbacks = 0;
}
