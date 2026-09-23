/**
 * CoachTactics — Client & Isomorphic Deterministic Cache Fingerprint
 *
 * Implements identical canonicalization and versioned SHA-256 fingerprinting
 * for client-side instant cache lookups and storage.
 *
 * Output matches server/cache/cacheFingerprint.ts exactly:
 *   drill-cache:v2:<sha256-hex>
 */

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

  cleaned = cleaned.replace(/(\d+)\s*-\s*(?=\d+)/g, '$1-');
  cleaned = cleaned.replace(/[.!?]+$/, '').trim();

  return cleaned;
}

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

export function normalizeFocusArea(focusArea?: string): string {
  if (!focusArea || typeof focusArea !== 'string') {
    return '';
  }
  return focusArea.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizePitchView(pitchView?: string): 'FULL' | 'HALF' {
  if (pitchView && pitchView.trim().toUpperCase() === 'HALF') {
    return 'HALF';
  }
  return 'FULL';
}

export function normalizeTacticalPrinciples(principles?: string[]): string[] | undefined {
  if (!principles || !Array.isArray(principles) || principles.length === 0) {
    return undefined;
  }
  const cleaned = principles
    .map((p) => (typeof p === 'string' ? p.trim().toLowerCase() : ''))
    .filter((p) => p.length > 0);

  if (cleaned.length === 0) return undefined;
  return Array.from(new Set(cleaned)).sort();
}

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
 * Pure JavaScript / TypeScript SHA-256 implementation (FIPS 180-4 compliant).
 * Runs synchronously in any browser or Node.js environment without external dependencies.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  // Encode UTF-8
  const utf8Bytes: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    let charcode = ascii.charCodeAt(i);
    if (charcode < 0x80) {
      utf8Bytes.push(charcode);
    } else if (charcode < 0x800) {
      utf8Bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8Bytes.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      // surrogate pair
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
      utf8Bytes.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const bitLength = utf8Bytes.length * 8;
  utf8Bytes.push(0x80);
  while ((utf8Bytes.length + 8) % 64 !== 0) {
    utf8Bytes.push(0x00);
  }

  // Append length as 64-bit big-endian
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  for (let i = 3; i >= 0; i--) {
    utf8Bytes.push((highBits >>> (i * 8)) & 0xff);
  }
  for (let i = 3; i >= 0; i--) {
    utf8Bytes.push((lowBits >>> (i * 8)) & 0xff);
  }

  const W = new Array(64);
  for (let i = 0; i < utf8Bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] =
        (utf8Bytes[i + t * 4] << 24) |
        (utf8Bytes[i + t * 4 + 1] << 16) |
        (utf8Bytes[i + t * 4 + 2] << 8) |
        utf8Bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (((W[t - 16] + s0) >>> 0) + ((W[t - 7] + s1) >>> 0)) >>> 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) >>> 0) + ch) >>> 0) + ((K[t] + W[t]) >>> 0)) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const toHex = (n: number) => ('00000000' + n.toString(16)).slice(-8);
  return toHex(H0) + toHex(H1) + toHex(H2) + toHex(H3) + toHex(H4) + toHex(H5) + toHex(H6) + toHex(H7);
}

export function generateCacheFingerprint(raw: TacticalGenerationContext): string {
  const canonical = canonicalizeContext(raw);
  const serialized = serializeCanonicalContext(canonical);
  const hash = sha256(serialized);
  return `${CACHE_KEY_PREFIX}${hash}`;
}
