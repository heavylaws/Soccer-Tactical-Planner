import bcrypt from 'bcryptjs';

export type UserRole = 'SUPER_ADMIN' | 'HEAD_COACH' | 'ASSISTANT_COACH' | 'CLIENT' | 'PLAYER';

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  avatarColor: string;
  passwordHash: string;
  needsEmailSetup?: boolean;
}

export interface SafeUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  avatarColor: string;
  needsEmailSetup?: boolean;
}

// In-memory server-authoritative user store
const usersMap = new Map<string, UserRecord>();

// Pre-hash initial development/demo credentials securely using bcrypt (cost 10)
function initializeDefaultUsers() {
  if (usersMap.size > 0) return;

  const defaultUsers: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    team: string;
    avatarColor: string;
    plainPassword: string;
    needsEmailSetup?: boolean;
  }[] = [
    {
      id: 'user_superadmin',
      username: 'heavylaws',
      name: 'HeavyLaws (Super Admin)',
      email: '',
      role: 'SUPER_ADMIN',
      team: 'Master Tactical HQ',
      avatarColor: '#00E5FF',
      plainPassword: 'A!t3r3g0',
      needsEmailSetup: true,
    },
    {
      id: 'user_client',
      username: 'c00ldude',
      name: 'Cool Dude (Client)',
      email: '',
      role: 'CLIENT',
      team: 'Client Academy',
      avatarColor: '#FFD600',
      plainPassword: '123456',
      needsEmailSetup: true,
    },
    {
      id: 'coach_head',
      username: 'pepguardiola',
      name: 'Coach Pep Guardiola',
      email: 'pep.guardiola@tactics.club',
      role: 'HEAD_COACH',
      team: 'Elite FC First Squad',
      avatarColor: '#00E676',
      plainPassword: 'coach123',
      needsEmailSetup: false,
    },
    {
      id: 'player_striker',
      username: 'rashford9',
      name: 'Marcus Rashford (#9)',
      email: 'marcus.r@tactics.club',
      role: 'PLAYER',
      team: 'Elite FC First Squad',
      avatarColor: '#FF6E40',
      plainPassword: 'player123',
      needsEmailSetup: false,
    },
  ];

  for (const u of defaultUsers) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(u.plainPassword, salt);
    usersMap.set(u.id, {
      id: u.id,
      username: u.username.toLowerCase().trim(),
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team,
      avatarColor: u.avatarColor,
      passwordHash,
      needsEmailSetup: u.needsEmailSetup,
    });
  }
}

// Strip sensitive fields (passwords, hashes) before returning to client
export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    avatarColor: user.avatarColor,
    needsEmailSetup: user.needsEmailSetup,
  };
}

export function findUserByUsername(username: string): UserRecord | null {
  initializeDefaultUsers();
  const clean = username.toLowerCase().trim();
  for (const user of usersMap.values()) {
    if (user.username === clean) {
      return user;
    }
  }
  return null;
}

export function findUserById(id: string): UserRecord | null {
  initializeDefaultUsers();
  return usersMap.get(id) || null;
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch {
    return false;
  }
}

export function getAllUsersSafe(): SafeUser[] {
  initializeDefaultUsers();
  return Array.from(usersMap.values()).map(toSafeUser);
}

export function createUser(userData: {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  avatarColor: string;
  plainPassword?: string;
  needsEmailSetup?: boolean;
}): SafeUser {
  initializeDefaultUsers();
  const cleanUsername = userData.username.toLowerCase().trim();
  const existing = findUserByUsername(cleanUsername);
  if (existing) {
    throw new Error('Username already exists');
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(userData.plainPassword || '123456', salt);
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: UserRecord = {
    id,
    username: cleanUsername,
    name: userData.name || cleanUsername,
    email: userData.email || '',
    role: userData.role || 'CLIENT',
    team: userData.team || 'Tactics Club',
    avatarColor: userData.avatarColor || '#00E5FF',
    passwordHash,
    needsEmailSetup: userData.needsEmailSetup ?? !userData.email,
  };

  usersMap.set(id, record);
  return toSafeUser(record);
}

export function updateUser(
  id: string,
  updates: Partial<Omit<UserRecord, 'id' | 'passwordHash'>> & { plainPassword?: string }
): SafeUser | null {
  initializeDefaultUsers();
  const user = usersMap.get(id);
  if (!user) return null;

  if (updates.username) {
    const cleanUsername = updates.username.toLowerCase().trim();
    const existing = findUserByUsername(cleanUsername);
    if (existing && existing.id !== id) {
      throw new Error('Username already exists');
    }
    user.username = cleanUsername;
  }

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.email !== undefined) {
    user.email = updates.email;
    if (user.email) user.needsEmailSetup = false;
  }
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.team !== undefined) user.team = updates.team;
  if (updates.avatarColor !== undefined) user.avatarColor = updates.avatarColor;
  if (updates.needsEmailSetup !== undefined) user.needsEmailSetup = updates.needsEmailSetup;

  if (updates.plainPassword && updates.plainPassword.trim().length > 0) {
    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(updates.plainPassword.trim(), salt);
  }

  usersMap.set(id, user);
  return toSafeUser(user);
}

export function deleteUser(id: string): boolean {
  initializeDefaultUsers();
  const user = usersMap.get(id);
  if (!user) return false;
  // Protect superadmin account from deletion
  if (user.username === 'heavylaws') return false;
  return usersMap.delete(id);
}
