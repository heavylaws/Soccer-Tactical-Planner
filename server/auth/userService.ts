// CoachTactics — server-authoritative user store.
// - No credentials in source. The first SUPER_ADMIN is bootstrapped from ADMIN_USERNAME / ADMIN_PASSWORD,
//   or a random password is generated and printed once to the server log.
// - Persists to DATA_DIR/users.json (atomic writes) unless STORAGE_DRIVER=memory.
// - tokenVersion invalidates existing sessions on password/role change or deletion.

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { config, IS_TEST } from '../config.ts';
import { readJsonFile, writeJsonFileAtomic } from '../storage/jsonFileStore.ts';

export type UserRole = 'SUPER_ADMIN' | 'HEAD_COACH' | 'ASSISTANT_COACH' | 'CLIENT' | 'PLAYER';

export const VALID_USER_ROLES: readonly UserRole[] = [
  'SUPER_ADMIN',
  'HEAD_COACH',
  'ASSISTANT_COACH',
  'CLIENT',
  'PLAYER',
] as const;

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
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
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

/** 400 — bad input. */
export class UserValidationError extends Error {
  readonly status = 400;
}
/** 409 — username taken. */
export class UserConflictError extends Error {
  readonly status = 409;
}
/** 403 — action violates an account-safety policy. */
export class UserPolicyError extends Error {
  readonly status = 403;
}

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores bytes beyond 72
const BCRYPT_COST = 11;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const usersMap = new Map<string, UserRecord>();
let loaded = false;

function usersFile(): string {
  return path.join(config.dataDir, 'users.json');
}

function persist(): void {
  if (config.storageDriver !== 'file') return;
  writeJsonFileAtomic(usersFile(), { version: 1, users: Array.from(usersMap.values()) });
}

export function generateStrongPassword(): string {
  // 20 chars, URL-safe, ~120 bits of entropy
  return crypto.randomBytes(15).toString('base64url');
}

export function normalizeUsername(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function assertUsername(username: string): void {
  if (!USERNAME_RE.test(username)) {
    throw new UserValidationError(
      'Username must be 3–32 characters: lowercase letters, digits, dot, dash or underscore, starting with a letter or digit.'
    );
  }
}

export function assertPasswordPolicy(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new UserValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    throw new UserValidationError(`Password must be at most ${MAX_PASSWORD_LENGTH} bytes.`);
  }
  return password;
}

function assertRole(role: unknown): UserRole {
  if (typeof role === 'string' && (VALID_USER_ROLES as readonly string[]).includes(role)) {
    return role as UserRole;
  }
  throw new UserValidationError(`Role must be one of: ${VALID_USER_ROLES.join(', ')}.`);
}

function cleanEmail(email: unknown): string {
  if (email === undefined || email === null || email === '') return '';
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new UserValidationError('Email address is not valid.');
  }
  return email.trim().toLowerCase();
}

function cleanText(value: unknown, field: string, max: number, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') throw new UserValidationError(`${field} must be text.`);
  const v = value.trim();
  if (v.length > max) throw new UserValidationError(`${field} must be at most ${max} characters.`);
  return v || fallback;
}

function cleanColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && COLOR_RE.test(value) ? value : fallback;
}

function defaultColorForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '#00E5FF';
    case 'CLIENT':
      return '#FFD600';
    case 'PLAYER':
      return '#FF6E40';
    default:
      return '#00E676';
  }
}

function superAdminCount(): number {
  let n = 0;
  for (const u of usersMap.values()) if (u.role === 'SUPER_ADMIN') n++;
  return n;
}

function bootstrapSuperAdmin(): void {
  const username = normalizeUsername(config.adminUsername) || 'admin';
  let password = config.adminPassword;
  let generated = false;

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    if (password) {
      console.warn(`[auth] ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters and was ignored.`);
    }
    password = generateStrongPassword();
    generated = true;
  }

  // Username clash with an existing non-admin account: promote nothing silently, use a suffixed name.
  let finalUsername = username;
  if (findUserByUsernameRaw(finalUsername)) finalUsername = `${username}-${crypto.randomBytes(2).toString('hex')}`;

  const now = new Date().toISOString();
  const record: UserRecord = {
    id: `user_${crypto.randomUUID()}`,
    username: finalUsername,
    name: 'Administrator',
    email: '',
    role: 'SUPER_ADMIN',
    team: 'Administration',
    avatarColor: '#00E5FF',
    passwordHash: bcrypt.hashSync(password, BCRYPT_COST),
    needsEmailSetup: true,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
  usersMap.set(record.id, record);
  persist();

  if (generated && !IS_TEST) {
    const line = '='.repeat(72);
    console.warn(
      `\n${line}\n  CoachTactics: bootstrap SUPER_ADMIN created\n  username: ${finalUsername}\n  password: ${password}\n` +
        `  Shown ONCE. Log in and change it, or set ADMIN_PASSWORD before first boot.\n${line}\n`
    );
  } else if (!IS_TEST) {
    console.log(`[auth] Bootstrap SUPER_ADMIN "${finalUsername}" created from ADMIN_PASSWORD.`);
  }
}

function applyAdminRecovery(): void {
  if (!config.adminResetPassword) return;
  const username = normalizeUsername(config.adminUsername);
  const user = findUserByUsernameRaw(username);
  if (!user) {
    console.error(`[auth] ADMIN_RESET_PASSWORD set but user "${username}" does not exist.`);
    return;
  }
  try {
    assertPasswordPolicy(config.adminPassword);
  } catch {
    console.error('[auth] ADMIN_RESET_PASSWORD set but ADMIN_PASSWORD does not meet policy; nothing changed.');
    return;
  }
  user.passwordHash = bcrypt.hashSync(config.adminPassword, BCRYPT_COST);
  user.role = 'SUPER_ADMIN';
  user.tokenVersion += 1;
  user.updatedAt = new Date().toISOString();
  persist();
  console.warn(`[auth] Password for "${username}" reset from ADMIN_PASSWORD. REMOVE ADMIN_RESET_PASSWORD now.`);
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;

  if (config.storageDriver === 'file') {
    const data = readJsonFile<{ users?: Partial<UserRecord>[] }>(usersFile(), {});
    for (const raw of data.users ?? []) {
      if (!raw || typeof raw.id !== 'string' || typeof raw.username !== 'string' || typeof raw.passwordHash !== 'string') {
        continue;
      }
      const role = (VALID_USER_ROLES as readonly string[]).includes(raw.role as string) ? (raw.role as UserRole) : 'CLIENT';
      usersMap.set(raw.id, {
        id: raw.id,
        username: raw.username,
        name: raw.name ?? raw.username,
        email: raw.email ?? '',
        role,
        team: raw.team ?? '',
        avatarColor: raw.avatarColor ?? defaultColorForRole(role),
        passwordHash: raw.passwordHash,
        needsEmailSetup: raw.needsEmailSetup,
        tokenVersion: typeof raw.tokenVersion === 'number' ? raw.tokenVersion : 0,
        createdAt: raw.createdAt ?? new Date(0).toISOString(),
        updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
      });
    }
  }

  applyAdminRecovery();
  if (superAdminCount() === 0) bootstrapSuperAdmin();
}

function findUserByUsernameRaw(username: string): UserRecord | null {
  for (const user of usersMap.values()) {
    if (user.username === username) return user;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

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
  ensureLoaded();
  return findUserByUsernameRaw(normalizeUsername(username));
}

export function findUserById(id: string): UserRecord | null {
  ensureLoaded();
  return usersMap.get(id) || null;
}

let dummyHash: string | null = null;

/**
 * Constant-work password check. When the user does not exist we still run bcrypt against a
 * dummy hash so response timing does not reveal which usernames exist.
 */
export async function verifyPassword(plainPassword: string, hash: string | null | undefined): Promise<boolean> {
  try {
    if (!hash) {
      dummyHash ??= bcrypt.hashSync(generateStrongPassword(), BCRYPT_COST);
      await bcrypt.compare(plainPassword, dummyHash);
      return false;
    }
    return await bcrypt.compare(plainPassword, hash);
  } catch {
    return false;
  }
}

export function getAllUsersSafe(): SafeUser[] {
  ensureLoaded();
  return Array.from(usersMap.values()).map(toSafeUser);
}

export interface CreateUserInput {
  username: unknown;
  password: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  team?: unknown;
  avatarColor?: unknown;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  ensureLoaded();
  const username = normalizeUsername(input.username);
  assertUsername(username);
  if (findUserByUsernameRaw(username)) throw new UserConflictError('Username already exists.');

  const password = assertPasswordPolicy(input.password);
  const role = input.role === undefined ? 'CLIENT' : assertRole(input.role);
  const email = cleanEmail(input.email);
  const now = new Date().toISOString();

  const record: UserRecord = {
    id: `user_${crypto.randomUUID()}`,
    username,
    name: cleanText(input.name, 'Name', 60, username),
    email,
    role,
    team: cleanText(input.team, 'Team', 60, 'Tactics Club'),
    avatarColor: cleanColor(input.avatarColor, defaultColorForRole(role)),
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    needsEmailSetup: !email,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  usersMap.set(record.id, record);
  persist();
  return toSafeUser(record);
}

export interface UpdateUserInput {
  username?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  team?: unknown;
  avatarColor?: unknown;
  password?: unknown;
  needsEmailSetup?: unknown;
}

export interface UpdateUserResult {
  user: SafeUser;
  /** True when existing sessions for this user were revoked (password or role change). */
  sessionsRevoked: boolean;
}

/**
 * @param actorId the authenticated user performing the change (for self-protection rules)
 */
export async function updateUser(id: string, updates: UpdateUserInput, actorId?: string): Promise<UpdateUserResult | null> {
  ensureLoaded();
  const user = usersMap.get(id);
  if (!user) return null;

  // Validate everything before mutating anything.
  let nextUsername = user.username;
  if (updates.username !== undefined && updates.username !== '') {
    nextUsername = normalizeUsername(updates.username);
    assertUsername(nextUsername);
    const existing = findUserByUsernameRaw(nextUsername);
    if (existing && existing.id !== id) throw new UserConflictError('Username already exists.');
  }

  let nextRole = user.role;
  if (updates.role !== undefined) {
    nextRole = assertRole(updates.role);
    if (user.role === 'SUPER_ADMIN' && nextRole !== 'SUPER_ADMIN') {
      if (actorId === id) throw new UserPolicyError('You cannot remove your own super administrator role.');
      if (superAdminCount() <= 1) throw new UserPolicyError('At least one super administrator must remain.');
    }
  }

  const nextEmail = updates.email !== undefined ? cleanEmail(updates.email) : user.email;
  const nextName = updates.name !== undefined ? cleanText(updates.name, 'Name', 60, user.username) : user.name;
  const nextTeam = updates.team !== undefined ? cleanText(updates.team, 'Team', 60, '') : user.team;
  const nextColor = updates.avatarColor !== undefined ? cleanColor(updates.avatarColor, user.avatarColor) : user.avatarColor;

  let nextHash: string | null = null;
  if (typeof updates.password === 'string' && updates.password.length > 0) {
    nextHash = await bcrypt.hash(assertPasswordPolicy(updates.password), BCRYPT_COST);
  }

  const roleChanged = nextRole !== user.role;
  user.username = nextUsername;
  user.name = nextName;
  user.team = nextTeam;
  user.avatarColor = nextColor;
  user.role = nextRole;
  if (updates.email !== undefined) {
    user.email = nextEmail;
    user.needsEmailSetup = !nextEmail;
  }
  if (typeof updates.needsEmailSetup === 'boolean') user.needsEmailSetup = updates.needsEmailSetup;
  if (nextHash) user.passwordHash = nextHash;

  const sessionsRevoked = Boolean(nextHash) || roleChanged;
  if (sessionsRevoked) user.tokenVersion += 1;
  user.updatedAt = new Date().toISOString();

  persist();
  return { user: toSafeUser(user), sessionsRevoked };
}

export function deleteUser(id: string, actorId?: string): boolean {
  ensureLoaded();
  const user = usersMap.get(id);
  if (!user) return false;
  if (actorId && actorId === id) throw new UserPolicyError('You cannot delete your own account.');
  if (user.role === 'SUPER_ADMIN' && superAdminCount() <= 1) {
    throw new UserPolicyError('At least one super administrator must remain.');
  }
  const ok = usersMap.delete(id);
  persist();
  return ok;
}

/** Test helper: wipe state and re-bootstrap. Never call from request handlers. */
export function resetUsersForTesting(): void {
  usersMap.clear();
  loaded = false;
  ensureLoaded();
}
