import { Router, Response, Request } from 'express';
import {
  findUserByUsername,
  findUserById,
  verifyPassword,
  toSafeUser,
  updateUser,
  normalizeUsername,
  UserValidationError,
} from '../auth/userService.ts';
import { generateToken, TOKEN_TTL_SECONDS } from '../auth/tokenService.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { FixedWindowLimiter, clientIp } from '../security/rateLimit.ts';
import { IS_PROD } from '../config.ts';

export const authRouter = Router();

// 20 attempts / 15 min per IP, and 8 failed attempts / 15 min per username.
// The per-username limiter protects accounts even when many users share one IP (NAT, proxy).
const loginIpLimiter = new FixedWindowLimiter(15 * 60 * 1000, 20);
const loginUserLimiter = new FixedWindowLimiter(15 * 60 * 1000, 8);

/** Sets the HttpOnly session cookie and returns the bearer token for iframe contexts. */
export function issueSession(res: Response, userId: string): string | null {
  const record = findUserById(userId);
  if (!record) return null;
  const token = generateToken({ id: record.id, role: record.role }, record.tokenVersion);
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });
  return token;
}

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !username.trim() ||
    !password ||
    username.length > 64 ||
    password.length > 256
  ) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const ipKey = `ip:${clientIp(req)}`;
  const userKey = `user:${normalizeUsername(username)}`;

  const ipResult = loginIpLimiter.hit(ipKey);
  const userState = loginUserLimiter.peek(userKey);
  if (!ipResult.allowed || !userState.allowed) {
    const retry = Math.max(ipResult.retryAfterSec, userState.retryAfterSec);
    res.setHeader('Retry-After', String(retry));
    return res.status(429).json({
      error: `Too many sign-in attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`,
      retryAfterSec: retry,
    });
  }

  const user = findUserByUsername(username);
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    loginUserLimiter.hit(userKey);
    // Generic message prevents username enumeration
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  loginUserLimiter.reset(userKey);
  const token = issueSession(res, user.id);

  return res.json({
    success: true,
    user: toSafeUser(user),
    token,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// PUT /api/auth/me/email — first-login email attachment
authRouter.put('/me/email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  try {
    const result = await updateUser(req.user.id, { email, needsEmailSetup: false }, req.user.id);
    if (!result) return res.status(404).json({ error: 'User account not found.' });
    return res.json({ success: true, user: result.user });
  } catch (err: any) {
    if (err instanceof UserValidationError) return res.status(400).json({ error: err.message });
    console.error('[auth] email update failed:', err);
    return res.status(500).json({ error: 'Failed to update email address.' });
  }
});
