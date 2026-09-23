import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/tokenService.ts';
import { findUserById, toSafeUser, SafeUser, UserRole } from '../auth/userService.ts';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function extractToken(req: Request): string | undefined {
  // 1. HttpOnly cookie (normal browser sessions)
  const cookieToken = (req as any).cookies?.auth_token;
  if (typeof cookieToken === 'string' && cookieToken) return cookieToken;

  // 2. Bearer header (needed when the app runs in a cross-site iframe, e.g. the AI Studio preview,
  //    where SameSite=Lax cookies are not sent)
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const t = header.substring(7).trim();
    if (t) return t;
  }
  return undefined;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const userRecord = findUserById(payload.sub);
  if (!userRecord) {
    return res.status(401).json({ error: 'User account not found. Please log in again.' });
  }

  // Revoked by password change, role change, or admin action
  if (userRecord.tokenVersion !== payload.tv) {
    return res.status(401).json({ error: 'Session was revoked. Please log in again.' });
  }

  req.user = toSafeUser(userRecord);
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Your role does not have access to this action.' });
    }
    next();
  };
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Super Administrator privileges required.' });
  }
  next();
}

/** Roles allowed to create/modify drills and spend AI quota. PLAYER is read-only. */
export const WRITER_ROLES: UserRole[] = ['SUPER_ADMIN', 'HEAD_COACH', 'ASSISTANT_COACH', 'CLIENT'];
