// CoachTactics Server-Authoritative Drill Service
import { IDrillRepository, defaultDrillRepository } from './drillRepository.ts';
import { StoredDrill } from './drillDomain.ts';
import { SafeUser } from '../auth/userService.ts';
import { validateTacticalDrill, TacticalValidationError } from '../tactical/tacticalValidator.ts';
import { config } from '../config.ts';

/** Maximum legacy drills accepted in one migration request. */
export const MAX_MIGRATION_BATCH = 100;

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  public details: TacticalValidationError[];
  constructor(message = 'Validation failed', details: TacticalValidationError[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export interface DrillServiceOptions {
  maxDrillsPerUser?: number;
}

export class DrillService {
  private readonly maxDrillsPerUser: number;

  constructor(
    private repo: IDrillRepository = defaultDrillRepository,
    options: DrillServiceOptions = {}
  ) {
    this.maxDrillsPerUser = options.maxDrillsPerUser ?? config.maxDrillsPerUser;
  }

  /** PLAYER accounts are read-only. Enforced here so no route can forget it. */
  private assertCanWrite(user: SafeUser): void {
    if (user.role === 'PLAYER') {
      throw new ForbiddenError('Players have read-only access to drills.');
    }
  }

  private async assertUnderQuota(user: SafeUser, adding = 1): Promise<void> {
    if (user.role === 'SUPER_ADMIN') return;
    const owned = await this.repo.findByCreator(user.id);
    if (owned.length + adding > this.maxDrillsPerUser) {
      throw new ForbiddenError(
        `Playbook limit reached (${this.maxDrillsPerUser} drills). Delete drills you no longer need, then try again.`
      );
    }
  }

  /**
   * Retrieves all drills accessible by the authenticated user based on role and ownership.
   */
  async getDrillsForUser(user: SafeUser): Promise<StoredDrill[]> {
    if (user.role === 'CLIENT') {
      // Clients start with a clean slate; only see drills created specifically by them
      return this.repo.findByCreator(user.id);
    }

    if (user.role === 'SUPER_ADMIN') {
      // Super admin can inspect all drills in the tactical system
      return this.repo.findAll();
    }

    // HEAD_COACH, ASSISTANT_COACH, and PLAYER: see system reference drills + their own drills
    const [systemDrills, userDrills] = await Promise.all([
      this.repo.findSystemDrills(),
      this.repo.findByCreator(user.id),
    ]);

    const seenIds = new Set<string>();
    const combined: StoredDrill[] = [];

    for (const d of [...userDrills, ...systemDrills]) {
      if (!seenIds.has(d.id)) {
        seenIds.add(d.id);
        combined.push(d);
      }
    }

    return combined;
  }

  /**
   * Retrieves a single drill by ID, enforcing strict authorization.
   * Returns null / throws NotFoundError if the drill does not exist or user is unauthorized
   * (to prevent enumeration of private tactical drills).
   */
  async getDrillById(id: string, user: SafeUser): Promise<StoredDrill> {
    const drill = await this.repo.findById(id);
    if (!drill) {
      throw new NotFoundError('Drill not found');
    }

    // Access evaluation
    if (drill.isSystem) {
      // Non-clients can view system drills
      if (user.role !== 'CLIENT') {
        return drill;
      }
      // If client attempts to view system drill, treat as not found to maintain client dashboard isolation
      throw new NotFoundError('Drill not found');
    }

    if (drill.createdBy === user.id || user.role === 'SUPER_ADMIN') {
      return drill;
    }

    // Unauthorized access returns 404 to avoid leaking existence of private drill IDs
    throw new NotFoundError('Drill not found');
  }

  /**
   * Creates a new tactical drill.
   * The server assigns createdBy, createdAt, version, and generates the authoritative ID.
   * Client-supplied ownership fields are strictly ignored/rejected.
   */
  async createDrill(rawPayload: unknown, user: SafeUser): Promise<StoredDrill> {
    this.assertCanWrite(user);
    await this.assertUnderQuota(user);
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      throw new ValidationError('Payload must be a valid tactical drill object');
    }

    // Validate the tactical domain payload using the Phase 3 canonical validator
    const valResult = validateTacticalDrill(rawPayload);
    if (!valResult.success || !valResult.drill) {
      throw new ValidationError('Tactical domain validation failed', valResult.errors);
    }

    const validated = valResult.drill;
    const now = new Date().toISOString();
    const authoritativeId = `drill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newDrill: StoredDrill = {
      id: authoritativeId,
      title: validated.title,
      category: validated.category,
      focusArea: validated.focusArea,
      durationMinutes: validated.durationMinutes,
      pitchView: validated.pitchView,
      description: validated.description,
      coachingCues: validated.coachingCues,
      phases: validated.phases,

      // Authoritative server-side identity & ownership (client cannot tamper)
      createdBy: user.id,
      createdByUsername: user.username,
      createdByRole: user.role,
      ownerId: user.id,
      createdAt: now,
      updatedBy: user.id,
      updatedAt: now,
      version: 1,
      isSystem: false,

      isCached: validated.isCached,
      cacheSource: validated.cacheSource,
      quotaSaved: validated.quotaSaved,
    };

    return this.repo.create(newDrill);
  }

  /**
   * Updates an existing tactical drill.
   * Verifies authorization (owner or SUPER_ADMIN).
   * Re-validates the modified tactical content through the Phase 3 validator.
   * Preserves immutable fields (createdBy, createdAt, isSystem).
   */
  async updateDrill(id: string, updates: unknown, user: SafeUser): Promise<StoredDrill> {
    this.assertCanWrite(user);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Drill not found');
    }

    // Authorization checks
    if (existing.isSystem && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('System demo drills cannot be modified');
    }

    if (existing.createdBy !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Not authorized to update this drill');
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new ValidationError('Update payload must be an object');
    }

    const u = updates as Record<string, unknown>;

    // Merge mutable tactical fields with existing drill
    const candidate: Record<string, unknown> = {
      ...existing,
      ...(u.title !== undefined ? { title: u.title } : {}),
      ...(u.category !== undefined ? { category: u.category } : {}),
      ...(u.focusArea !== undefined ? { focusArea: u.focusArea } : {}),
      ...(u.durationMinutes !== undefined ? { durationMinutes: u.durationMinutes } : {}),
      ...(u.pitchView !== undefined ? { pitchView: u.pitchView } : {}),
      ...(u.description !== undefined ? { description: u.description } : {}),
      ...(u.coachingCues !== undefined ? { coachingCues: u.coachingCues } : {}),
      ...(u.phases !== undefined ? { phases: u.phases } : {}),
    };

    // Re-validate the merged candidate through Phase 3 canonical validator
    const valResult = validateTacticalDrill(candidate);
    if (!valResult.success || !valResult.drill) {
      throw new ValidationError('Tactical domain validation failed on update', valResult.errors);
    }

    const validated = valResult.drill;
    const now = new Date().toISOString();

    const updatedDrill: StoredDrill = {
      id: existing.id, // Immutable
      title: validated.title,
      category: validated.category,
      focusArea: validated.focusArea,
      durationMinutes: validated.durationMinutes,
      pitchView: validated.pitchView,
      description: validated.description,
      coachingCues: validated.coachingCues,
      phases: validated.phases,

      // Authoritative immutable ownership fields
      createdBy: existing.createdBy,
      createdByUsername: existing.createdByUsername,
      createdByRole: existing.createdByRole,
      ownerId: existing.createdBy,
      createdAt: existing.createdAt,
      isSystem: existing.isSystem,

      // Authoritative mutation metadata
      updatedBy: user.id,
      updatedAt: now,
      version: (existing.version || 1) + 1,
    };

    return this.repo.update(id, updatedDrill);
  }

  /**
   * Deletes a tactical drill.
   * Enforces owner authorization and protects system drills.
   */
  async deleteDrill(id: string, user: SafeUser): Promise<boolean> {
    this.assertCanWrite(user);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Drill not found');
    }

    if (existing.isSystem && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('System demo drills cannot be deleted');
    }

    if (existing.createdBy !== user.id && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Not authorized to delete this drill');
    }

    return this.repo.delete(id);
  }

  /**
   * Imports legacy drills from browser localStorage.
   * Each drill is validated through Phase 3 validator and assigned server ownership.
   */
  async migrateLegacyDrills(
    rawDrills: unknown[],
    user: SafeUser
  ): Promise<{ imported: number; failed: number; drills: StoredDrill[] }> {
    this.assertCanWrite(user);
    if (!Array.isArray(rawDrills)) {
      throw new ValidationError('Drills to migrate must be an array');
    }
    if (rawDrills.length > MAX_MIGRATION_BATCH) {
      throw new ValidationError(`At most ${MAX_MIGRATION_BATCH} drills can be migrated per request`);
    }
    await this.assertUnderQuota(user, rawDrills.length);

    let imported = 0;
    let failed = 0;
    const importedDrills: StoredDrill[] = [];

    for (const raw of rawDrills) {
      try {
        const valResult = validateTacticalDrill(raw);
        if (!valResult.success || !valResult.drill) {
          failed++;
          continue;
        }

        const validated = valResult.drill;
        const now = new Date().toISOString();
        const authoritativeId = `drill_migrated_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const stored = await this.repo.create({
          id: authoritativeId,
          title: validated.title,
          category: validated.category,
          focusArea: validated.focusArea,
          durationMinutes: validated.durationMinutes,
          pitchView: validated.pitchView,
          description: validated.description,
          coachingCues: validated.coachingCues,
          phases: validated.phases,
          createdBy: user.id,
          createdByUsername: user.username,
          createdByRole: user.role,
          ownerId: user.id,
          createdAt: now,
          updatedBy: user.id,
          updatedAt: now,
          version: 1,
          isSystem: false,
        });

        importedDrills.push(stored);
        imported++;
      } catch {
        failed++;
      }
    }

    return { imported, failed, drills: importedDrills };
  }
}

// Default singleton service instance
export const defaultDrillService = new DrillService(defaultDrillRepository);
