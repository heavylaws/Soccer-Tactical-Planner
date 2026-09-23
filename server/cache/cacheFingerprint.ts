/**
 * CoachTactics — Phase 5: Deterministic Tactical Cache Fingerprinting
 *
 * Implements deterministic canonicalization and versioned SHA-256 fingerprinting
 * for soccer tactical drill generation requests.
 *
 * Structure:
 *   drill-cache:v2:<sha256-hex>
 *
 * Rules:
 * - Versioned ('v2')
 * - Exact matching only: eliminates all fuzzy matching and token overlap collisions
 * - Whitespace trimming and collapse
 * - Case normalization where semantics allow
 * - Normalization of formation notation (e.g. "4 - 3 - 3" -> "4-3-3")
 * - Pitch view normalization ('FULL' | 'HALF')
 * - Engine mode isolation ('gemini' vs 'eco')
 * - Deterministic alphabetical key ordering in JSON serialization
 * - Preserves word order and tactical prepositions (e.g. "press #6", "run behind")
 * - Strictly excludes transient UI state, timestamps, credentials, and user IDs
 */

import crypto from 'crypto';

export const CACHE_VERSION = 'v2' as const;
export const CACHE_KEY_PREFIX = `drill-cache:${CACHE_VERSION}:` as const;

export interface TacticalGenerationContext {
  prompt: string;
  formation?: string;
  focusArea?: string;
  pitchView?: 'FULL' | 'HALF' | string;
  ecoMode?: boolean;
  playerCount?: number;
  tacticalPrinciples?: string[];
}

export interface CanonicalGenerationContext {
  version: typeof CACHE_VERSION;
  prompt: string;
  formation: string;
  focusArea: string;
  pitchView: 'FULL' | 'HALF';
  engineMode: 'gemini' | 'eco';
  playerCount?: number;
  tacticalPrinciples?: string[];
}

/**
 * Normalizes tactical prompt text:
 * - Trims leading/trailing whitespace
 * - Collapses multiple internal whitespace characters to single spaces
 * - Converts to lowercase
 * - Normalizes smart quotes and backticks to ASCII
 * - Strips non-tactical edge punctuation while preserving player numbers (#6, #10) and hyphens (4-3-3)
 * - CRITICAL: Does NOT sort words (preserves tactical directionality and phrase semantics)
 * - CRITICAL: Does NOT strip tactical prepositions ("behind", "into", "over", "under", "between")
 */
export function normalizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }

  let cleaned = prompt
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/`/g, "'")
    .replace(/\s+/g, ' ');

  // Normalize spaces around hyphens in formations inside prompt (e.g. "4 - 3 - 3" -> "4-3-3")
  cleaned = cleaned.replace(/(\d+)\s*-\s*(?=\d+)/g, '$1-');

  // Remove trailing period or exclamation if present
  cleaned = cleaned.replace(/[.!?]+$/, '').trim();

  return cleaned;
}

/**
 * Normalizes formation string:
 * - Trims and lowercases
 * - Normalizes spaces around hyphens ("4 - 3 - 3" -> "4-3-3")
 */
export function normalizeFormation(formation?: string): string {
  if (!formation || typeof formation !== 'string') {
    return '';
  }
  return formation
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes tactical focus area string
 */
export function normalizeFocusArea(focusArea?: string): string {
  if (!focusArea || typeof focusArea !== 'string') {
    return '';
  }
  return focusArea.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes pitch perspective
 */
export function normalizePitchView(pitchView?: string): 'FULL' | 'HALF' {
  if (pitchView && pitchView.trim().toUpperCase() === 'HALF') {
    return 'HALF';
  }
  return 'FULL';
}

/**
 * Normalizes an array of tactical principles (unordered constraint set)
 */
export function normalizeTacticalPrinciples(principles?: string[]): string[] | undefined {
  if (!principles || !Array.isArray(principles) || principles.length === 0) {
    return undefined;
  }
  const cleaned = principles
    .map((p) => (typeof p === 'string' ? p.trim().toLowerCase() : ''))
    .filter((p) => p.length > 0);

  if (cleaned.length === 0) return undefined;
  // Tactical principles are an unordered constraint set; sort deterministically
  return Array.from(new Set(cleaned)).sort();
}

/**
 * Canonicalizes a raw generation request context into a strict, deterministic schema.
 */
export function canonicalizeContext(raw: TacticalGenerationContext): CanonicalGenerationContext {
  const prompt = normalizePrompt(raw.prompt);
  const formation = normalizeFormation(raw.formation);
  const focusArea = normalizeFocusArea(raw.focusArea);
  const pitchView = normalizePitchView(raw.pitchView);
  const engineMode: 'gemini' | 'eco' = raw.ecoMode ? 'eco' : 'gemini';

  const canonical: CanonicalGenerationContext = {
    version: CACHE_VERSION,
    prompt,
    formation,
    focusArea,
    pitchView,
    engineMode,
  };

  if (typeof raw.playerCount === 'number' && Number.isFinite(raw.playerCount) && raw.playerCount > 0) {
    canonical.playerCount = Math.floor(raw.playerCount);
  }

  const normalizedPrinciples = normalizeTacticalPrinciples(raw.tacticalPrinciples);
  if (normalizedPrinciples) {
    canonical.tacticalPrinciples = normalizedPrinciples;
  }

  return canonical;
}

/**
 * Deterministically serializes a canonical context into a JSON string
 * with sorted object keys.
 */
export function serializeCanonicalContext(canonical: CanonicalGenerationContext): string {
  const sortedKeys = Object.keys(canonical).sort() as (keyof CanonicalGenerationContext)[];
  const sortedObj: Record<string, any> = {};

  for (const key of sortedKeys) {
    const val = canonical[key];
    if (val !== undefined && val !== null && val !== '') {
      sortedObj[key] = val;
    }
  }

  return JSON.stringify(sortedObj);
}

/**
 * Computes SHA-256 hash of a string using Node.js crypto module.
 */
export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generates the authoritative, versioned cache fingerprint for a tactical generation request.
 * Format: `drill-cache:v2:<sha256-hex>`
 */
export function generateCacheFingerprint(raw: TacticalGenerationContext): string {
  const canonical = canonicalizeContext(raw);
  const serialized = serializeCanonicalContext(canonical);
  const hash = computeSha256(serialized);
  return `${CACHE_KEY_PREFIX}${hash}`;
}
