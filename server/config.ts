// CoachTactics — central runtime configuration (single source of truth for env vars)
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const IS_PROD = process.env.NODE_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';

function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function readBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/**
 * Express "trust proxy" setting.
 * - Explicit TRUST_PROXY wins (number of hops, "loopback", CIDR list, or "false").
 * - On Cloud Run (K_SERVICE is set) we trust exactly one hop (Google Front End).
 * - Otherwise only loopback (e.g. Nginx/Caddy on the same host).
 * Never default to `true` — that lets any client spoof X-Forwarded-For and bypass rate limits.
 */
function readTrustProxy(raw: string | undefined): boolean | number | string {
  if (raw !== undefined && raw.trim() !== '') {
    const v = raw.trim();
    if (v === 'false' || v === '0') return false;
    if (/^\d+$/.test(v)) return Number.parseInt(v, 10);
    return v;
  }
  if (process.env.K_SERVICE) return 1;
  return 'loopback';
}

const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

export const config = {
  port: readInt(process.env.PORT, 3000, 1, 65535),

  /** Where users.json, drills.json and the auth secret live. Mount a volume here in production. */
  dataDir: path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data')),

  /** 'file' persists to DATA_DIR; 'memory' is volatile (used automatically by the test suites). */
  storageDriver: ((process.env.STORAGE_DRIVER || (IS_TEST ? 'memory' : 'file')).toLowerCase() === 'memory'
    ? 'memory'
    : 'file') as 'file' | 'memory',

  trustProxy: readTrustProxy(process.env.TRUST_PROXY),

  /** Optional CSP frame-ancestors value, e.g. "'self' https://example.com". Empty = header not set. */
  frameAncestors: (process.env.FRAME_ANCESTORS || '').trim(),

  // --- Bootstrap super administrator (only used when no SUPER_ADMIN exists yet) ---
  adminUsername: (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  /** One-shot recovery: re-applies ADMIN_PASSWORD to ADMIN_USERNAME on boot. Remove after use. */
  adminResetPassword: readBool(process.env.ADMIN_RESET_PASSWORD, false),

  // --- Gemini ---
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModels: (process.env.GEMINI_MODELS || DEFAULT_GEMINI_MODELS.join(','))
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  geminiTimeoutMs: readInt(process.env.GEMINI_TIMEOUT_MS, 30_000, 5_000, 120_000),
  geminiMaxOutputTokens: readInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 8192, 2048, 32768),

  // --- Abuse limits ---
  maxDrillsPerUser: readInt(process.env.MAX_DRILLS_PER_USER, 300, 10, 10_000),
  generateLimitPerWindow: readInt(process.env.GENERATE_LIMIT_PER_10MIN, 20, 1, 1000),
  maxCachedDrills: readInt(process.env.MAX_CACHED_DRILLS, 500, 20, 20_000),
};

export type AppConfig = typeof config;
