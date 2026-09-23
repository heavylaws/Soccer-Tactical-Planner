// CoachTactics — session token issuing/verification.
// Secret resolution order: AUTH_SECRET env (>=32 chars) → persisted DATA_DIR/.auth_secret → ephemeral random.
// Persisting the secret means a container restart no longer logs every user out.

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config, IS_PROD, IS_TEST } from '../config.ts';
import { writeTextFileAtomic } from '../storage/jsonFileStore.ts';

export const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPayload {
  sub: string;
  /** tokenVersion at issue time; a mismatch means the session was revoked */
  tv: number;
  role: string;
  iat?: number;
  exp?: number;
}

let cachedSecret: string | null = null;

function resolveSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.AUTH_SECRET || '';
  if (fromEnv.length >= 32) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }
  if (fromEnv) console.warn('[auth] AUTH_SECRET is shorter than 32 characters and was ignored.');

  if (config.storageDriver === 'file') {
    const file = path.join(config.dataDir, '.auth_secret');
    try {
      const existing = fs.readFileSync(file, 'utf8').trim();
      if (existing.length >= 32) {
        cachedSecret = existing;
        return cachedSecret;
      }
    } catch {
      /* not created yet */
    }
    const generated = crypto.randomBytes(48).toString('hex');
    writeTextFileAtomic(file, generated);
    cachedSecret = generated;
    return cachedSecret;
  }

  if (IS_PROD && !IS_TEST) {
    console.warn('[auth] No AUTH_SECRET and STORAGE_DRIVER=memory: sessions will not survive a restart.');
  }
  cachedSecret = crypto.randomBytes(48).toString('hex');
  return cachedSecret;
}

export function generateToken(user: { id: string; role: string }, tokenVersion: number): string {
  const payload: TokenPayload = { sub: user.id, tv: tokenVersion, role: user.role };
  return jwt.sign(payload, resolveSecret(), { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, resolveSecret(), { algorithms: ['HS256'] }) as TokenPayload;
    if (!decoded || typeof decoded.sub !== 'string') return null;
    return { ...decoded, tv: typeof decoded.tv === 'number' ? decoded.tv : 0 };
  } catch {
    return null;
  }
}
