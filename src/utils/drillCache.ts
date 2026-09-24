import { SoccerDrill } from '../types';
import {
  generateCacheFingerprint,
  CACHE_VERSION,
} from './cacheFingerprint';

// Keys are scoped per user so a shared device (e.g. a touchline tablet) never shows
// one account's cached drills to another account.
const CLIENT_CACHE_PREFIX = `coach_tactics_drill_cache_${CACHE_VERSION}`;
const LEGACY_KEYS = ['coach_tactics_drill_cache_v1', `coach_tactics_drill_cache_${CACHE_VERSION}`];
// Quota counters are per user too, and cleared on logout with the drill cache.
const QUOTA_STATS_PREFIX = 'coach_tactics_quota_stats_v2';
const LEGACY_QUOTA_KEYS = ['coach_tactics_quota_stats_v1'];

function quotaKeyFor(userId: string): string {
  return `${QUOTA_STATS_PREFIX}:${userId}`;
}

function cacheKeyFor(userId: string): string {
  return `${CLIENT_CACHE_PREFIX}:${userId}`;
}

interface StoredCacheItem {
  fingerprint: string;
  drill: SoccerDrill;
  timestamp: number;
}

/**
 * Normalizes prompt parameters into the deterministic cache fingerprint
 */
export function getFingerprintForRequest(
  prompt: string,
  formation = '',
  focusArea = '',
  pitchView = 'FULL',
  ecoMode = false
): string {
  return generateCacheFingerprint({
    prompt,
    formation,
    focusArea,
    pitchView,
    ecoMode,
  });
}

/**
 * Retrieves a cached drill from client localStorage using EXACT deterministic fingerprint matching.
 * Token overlap and fuzzy matching have been completely eliminated.
 */
export function getClientCachedDrill(
  userId: string,
  prompt: string,
  formation = '',
  focusArea = '',
  pitchView = 'FULL',
  ecoMode = false
): SoccerDrill | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(cacheKeyFor(userId));
    if (!raw) return null;

    const cache: Record<string, StoredCacheItem> = JSON.parse(raw);
    const fingerprint = getFingerprintForRequest(prompt, formation, focusArea, pitchView, ecoMode);

    const match = cache[fingerprint];
    if (match && match.drill && Array.isArray(match.drill.phases) && match.drill.phases.length > 0) {
      incrementQuotaStat(userId, 'clientHits');
      return {
        ...match.drill,
        isCached: true,
        cacheSource: 'client',
        quotaSaved: true,
      };
    }

    return null;
  } catch (e) {
    console.warn('Failed to retrieve drill from client cache:', e);
    return null;
  }
}

/**
 * Saves a validated newly-generated drill into client storage keyed by exact deterministic fingerprint.
 */
export function saveDrillToClientCache(
  userId: string,
  prompt: string,
  drill: SoccerDrill,
  formation = '',
  focusArea = '',
  pitchView = 'FULL',
  ecoMode = false
): void {
  if (!userId) return;
  const key = cacheKeyFor(userId);
  try {
    const raw = localStorage.getItem(key);
    const cache: Record<string, StoredCacheItem> = raw ? JSON.parse(raw) : {};

    const fingerprint = getFingerprintForRequest(prompt, formation, focusArea, pitchView, ecoMode);
    cache[fingerprint] = {
      fingerprint,
      drill: {
        ...drill,
        isCached: true,
        cacheSource: drill.cacheSource || 'client',
        quotaSaved: true,
      },
      timestamp: Date.now(),
    };

    // Keep cache bounded to 100 items
    const entries = Object.entries(cache);
    if (entries.length > 100) {
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const pruned = Object.fromEntries(entries.slice(0, 100));
      localStorage.setItem(key, JSON.stringify(pruned));
    } else {
      localStorage.setItem(key, JSON.stringify(cache));
    }
  } catch (e) {
    console.warn('Failed to save drill to client cache:', e);
  }
}

export interface QuotaStats {
  clientHits: number;
  serverHits: number;
  apiCalls: number;
  totalSaved: number;
}

export function getQuotaStats(userId?: string | null): QuotaStats {
  if (!userId) return { clientHits: 0, serverHits: 0, apiCalls: 0, totalSaved: 0 };
  try {
    const raw = localStorage.getItem(quotaKeyFor(userId));
    if (!raw) {
      return { clientHits: 0, serverHits: 0, apiCalls: 0, totalSaved: 0 };
    }
    const data = JSON.parse(raw);
    const clientHits = data.clientHits || 0;
    const serverHits = data.serverHits || 0;
    const apiCalls = data.apiCalls || 0;
    return {
      clientHits,
      serverHits,
      apiCalls,
      totalSaved: clientHits + serverHits,
    };
  } catch {
    return { clientHits: 0, serverHits: 0, apiCalls: 0, totalSaved: 0 };
  }
}

export function incrementQuotaStat(userId: string | null | undefined, stat: 'clientHits' | 'serverHits' | 'apiCalls'): void {
  if (!userId) return;
  try {
    const stats = getQuotaStats(userId);
    stats[stat] = (stats[stat] || 0) + 1;
    stats.totalSaved = stats.clientHits + stats.serverHits;
    localStorage.setItem(quotaKeyFor(userId), JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/** Removes cached drills and quota counters for every user on this device (called on logout). */
export function clearClientCache(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith(`${CLIENT_CACHE_PREFIX}:`) ||
          k.startsWith(`${QUOTA_STATS_PREFIX}:`) ||
          LEGACY_KEYS.includes(k) ||
          LEGACY_QUOTA_KEYS.includes(k))
      )
        toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
