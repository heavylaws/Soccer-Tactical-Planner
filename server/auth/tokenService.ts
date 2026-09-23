import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { SafeUser } from './userService.ts';

// Server-side signing secret. Falls back to a cryptographically secure random secret generated on server boot.
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(user: SafeUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(payload, AUTH_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as TokenPayload;
    if (!decoded || !decoded.sub) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
