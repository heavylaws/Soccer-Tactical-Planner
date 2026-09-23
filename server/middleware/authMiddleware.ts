import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/tokenService.ts';
import { findUserById, toSafeUser, SafeUser } from '../auth/userService.ts';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check HttpOnly cookie first
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  // 2. Fall back to Authorization Bearer header
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in.',
    });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.',
    });
  }

  const userRecord = findUserById(payload.sub);
  if (!userRecord) {
    return res.status(401).json({
      error: 'User account not found. Please log in again.',
    });
  }

  // Attach safe user identity to downstream request context
  req.user = toSafeUser(userRecord);
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Access denied. Super Administrator privileges required.',
    });
  }

  next();
}
