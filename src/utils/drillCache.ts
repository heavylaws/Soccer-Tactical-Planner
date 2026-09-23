import { SoccerDrill } from '../types';
import {
  generateCacheFingerprint,
  CACHE_VERSION,
} from './cacheFingerprint';

const CLIENT_CACHE_KEY = `coach_tactics_drill_cache_${CACHE_VERSION}`;
const QUOTA_STATS_KEY = 'coach_tactics_quota_stats_v1';

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
  prompt: string,
  formation = '',
  focusArea = '',
  pitchView = 'FULL',
  ecoMode = false
): SoccerDrill | null {
  try {
    const raw = localStorage.getItem(CLIENT_CACHE_KEY);
    if (!raw) return null;

    const cache: Record<string, StoredCacheItem> = JSON.parse(raw);
    const fingerprint = getFingerprintForRequest(prompt, formation, focusArea, pitchView, ecoMode);

    const match = cache[fingerprint];
    if (match && match.drill && Array.isArray(match.drill.phases) && match.drill.phases.length > 0) {
      incrementQuotaStat('clientHits');
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
  prompt: string,
  drill: SoccerDrill,
  formation = '',
  focusArea = '',
  pitchView = 'FULL',
  ecoMode = false
): void {
  try {
    const raw = localStorage.getItem(CLIENT_CACHE_KEY);
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
      localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(pruned));
    } else {
      localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(cache));
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

export function getQuotaStats(): QuotaStats {
  try {
    const raw = localStorage.getItem(QUOTA_STATS_KEY);
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

export function incrementQuotaStat(stat: 'clientHits' | 'serverHits' | 'apiCalls'): void {
  try {
    const stats = getQuotaStats();
    stats[stat] = (stats[stat] || 0) + 1;
    stats.totalSaved = stats.clientHits + stats.serverHits;
    localStorage.setItem(QUOTA_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function clearClientCache(): void {
  try {
    localStorage.removeItem(CLIENT_CACHE_KEY);
    // Also clean up any legacy v1 cache if present
    localStorage.removeItem('coach_tactics_drill_cache_v1');
  } catch {
    // ignore
  }
}
