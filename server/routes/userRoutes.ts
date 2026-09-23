import { Router, Response } from 'express';
import {
  getAllUsersSafe,
  createUser,
  updateUser,
  deleteUser,
  findUserById,
  UserValidationError,
  UserConflictError,
  UserPolicyError,
} from '../auth/userService.ts';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { issueSession } from './authRoutes.ts';
import { FixedWindowLimiter, rateLimit } from '../security/rateLimit.ts';

export const userRouter = Router();

// All user management routes require an authenticated SUPER_ADMIN session
userRouter.use(requireAuth);
userRouter.use(requireSuperAdmin);
userRouter.use(
  rateLimit(new FixedWindowLimiter(60_000, 60), (req: AuthenticatedRequest) => `admin:${req.user?.id}`, 'Too many admin actions. Slow down.')
);

function sendUserError(res: Response, err: unknown, fallback: string) {
  if (err instanceof UserValidationError || err instanceof UserConflictError || err instanceof UserPolicyError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  console.error('[users]', fallback, err);
  return res.status(500).json({ success: false, error: fallback });
}

// GET /api/users
userRouter.get('/', (_req, res) => {
  return res.json({ users: getAllUsersSafe() });
});

// POST /api/users — password is required and must meet policy (no default passwords)
userRouter.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { username, name, email, role, team, avatarColor, password } = req.body || {};
  try {
    const user = await createUser({ username, name, email, role, team, avatarColor, password });
    return res.status(201).json({ success: true, user });
  } catch (err) {
    return sendUserError(res, err, 'Failed to create user.');
  }
});

// PUT /api/users/:id — update profile / role / reset password
userRouter.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { username, name, email, role, team, avatarColor, password } = req.body || {};

  try {
    const result = await updateUser(id, { username, name, email, role, team, avatarColor, password }, req.user!.id);
    if (!result) return res.status(404).json({ success: false, error: 'User not found.' });

    // Admin changed their own password: their current session was revoked, so re-issue one.
    let token: string | null = null;
    if (result.sessionsRevoked && id === req.user!.id) {
      token = issueSession(res, id);
    }
    return res.json({ success: true, user: result.user, sessionsRevoked: result.sessionsRevoked, ...(token ? { token } : {}) });
  } catch (err) {
    return sendUserError(res, err, 'Failed to update user.');
  }
});

// DELETE /api/users/:id
userRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!findUserById(id)) return res.status(404).json({ success: false, error: 'User not found.' });
  try {
    const success = deleteUser(id, req.user!.id);
    return res.json({ success });
  } catch (err) {
    return sendUserError(res, err, 'Failed to delete user.');
  }
});
