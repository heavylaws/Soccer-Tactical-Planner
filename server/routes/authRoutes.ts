import { Router, Response } from 'express';
import {
  findUserByUsername,
  verifyPassword,
  toSafeUser,
  updateUser,
} from '../auth/userService.ts';
import { generateToken } from '../auth/tokenService.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Username and password are required.',
    });
  }

  const user = findUserByUsername(username);
  if (!user) {
    // Return generic error message to prevent user enumeration
    return res.status(401).json({
      error: 'Invalid username or password.',
    });
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid username or password.',
    });
  }

  const safeUser = toSafeUser(user);
  const token = generateToken(safeUser);

  // Set secure HttpOnly cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return res.json({
    success: true,
    user: safeUser,
    token,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    user: req.user,
  });
});

// PUT /api/auth/me/email - for initial email attachment on first login
authRouter.put('/me/email', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  const updated = updateUser(req.user.id, { email: email.trim(), needsEmailSetup: false });
  if (!updated) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  return res.json({
    success: true,
    user: updated,
  });
});
