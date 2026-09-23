import { Router, Response } from 'express';
import {
  getAllUsersSafe,
  createUser,
  updateUser,
  deleteUser,
  findUserById,
  toSafeUser,
} from '../auth/userService.ts';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../middleware/authMiddleware.ts';

export const userRouter = Router();

// All user management routes require authenticated server session + SUPER_ADMIN role
userRouter.use(requireAuth);
userRouter.use(requireSuperAdmin);

// GET /api/users - returns list of safe user profiles
userRouter.get('/', (_req, res) => {
  const users = getAllUsersSafe();
  return res.json({ users });
});

// POST /api/users - creates new user with bcrypt-hashed password
userRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const { username, name, email, role, team, avatarColor, password } = req.body || {};

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required.' });
  }

  try {
    const newUser = createUser({
      username: username.trim(),
      name: name || username.trim(),
      email: email || '',
      role: role || 'CLIENT',
      team: team || 'Tactics Club',
      avatarColor: avatarColor || '#00E5FF',
      plainPassword: password || '123456',
    });
    return res.status(201).json({ success: true, user: newUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create user.' });
  }
});

// PUT /api/users/:id - updates user profile or resets password
userRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { username, name, email, role, team, avatarColor, password } = req.body || {};

  try {
    const updated = updateUser(id, {
      username,
      name,
      email,
      role,
      team,
      avatarColor,
      plainPassword: password,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update user.' });
  }
});

// DELETE /api/users/:id
userRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = findUserById(id);
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (target.username === 'heavylaws') {
    return res.status(403).json({ error: 'Cannot delete primary super administrator.' });
  }

  const success = deleteUser(id);
  return res.json({ success });
});
