import { SoccerDrill } from '../types';

const CLIENT_CACHE_KEY = 'coach_tactics_drill_cache_v1';
const QUOTA_STATS_KEY = 'coach_tactics_quota_stats_v1';

// Common stop words to strip when building canonical prompt fingerprints
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'from',
  'drill', 'drills', 'exercise', 'training', 'practice', 'session', 'plan',
  'tactical', 'tactics', 'animated', 'animation', 'please', 'generate', 'create',
  'make', 'build', 'show', 'soccer', 'football', 'coach'
]);

/**
 * Normalizes a prompt into a deterministic tactical key
 */
export function normalizeTacticalPrompt(
  prompt: string,
  formation = '',
  focusArea = ''
): string {
  const combined = `${prompt} ${formation} ${focusArea}`.toLowerCase();
  const tokens = combined
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .sort();

  return tokens.join('_') || 'tactical_general_drill';
}

interface StoredCacheItem {
  key: string;
  drill: SoccerDrill;
  timestamp: number;
}

export function getClientCachedDrill(
  prompt: string,
  formation = '',
  focusArea = ''
): SoccerDrill | null {
  try {
    const raw = localStorage.getItem(CLIENT_CACHE_KEY);
    if (!raw) return null;

    const cache: Record<string, StoredCacheItem> = JSON.parse(raw);
    const key = normalizeTacticalPrompt(prompt, formation, focusArea);

    if (cache[key]) {
      incrementQuotaStat('clientHits');
      return {
        ...cache[key].drill,
        isCached: true,
        cacheSource: 'client',
        quotaSaved: true,
      };
    }

    // Try token overlap match (if at least 80% of keywords match)
    const incomingTokens = key.split('_').filter(Boolean);
    if (incomingTokens.length >= 3) {
      for (const [k, item] of Object.entries(cache)) {
        const cachedTokens = k.split('_').filter(Boolean);
        const matchCount = incomingTokens.filter((t) => cachedTokens.includes(t)).length;
        const ratio = matchCount / incomingTokens.length;
        if (ratio >= 0.8) {
          incrementQuotaStat('clientHits');
          return {
            ...item.drill,
            isCached: true,
            cacheSource: 'client',
            quotaSaved: true,
          };
        }
      }
    }

    return null;
  } catch (e) {
    console.warn('Failed to retrieve drill from client cache:', e);
    return null;
  }
}

export function saveDrillToClientCache(
  prompt: string,
  drill: SoccerDrill,
  formation = '',
  focusArea = ''
): void {
  try {
    const raw = localStorage.getItem(CLIENT_CACHE_KEY);
    const cache: Record<string, StoredCacheItem> = raw ? JSON.parse(raw) : {};

    const key = normalizeTacticalPrompt(prompt, formation, focusArea);
    cache[key] = {
      key,
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
  } catch {
    // ignore
  }
}
