// Server-Side Tactical Domain & Schema Validator for CoachTactics
import {
  SoccerDrill,
  DrillPhase,
  TacticalPlayer,
  TacticalBall,
  TacticalEquipment,
  TeamRole,
  BallTrajectory,
  EquipmentType,
  PitchViewMode,
  VALID_TEAM_ROLES,
  VALID_BALL_TRAJECTORIES,
  VALID_EQUIPMENT_TYPES,
  VALID_PITCH_VIEWS,
} from './tacticalDomain.ts';

export interface TacticalValidationError {
  path: string;
  message: string;
  code: string;
  received?: unknown;
}

export interface TacticalValidationResult {
  success: boolean;
  drill?: SoccerDrill;
  errors?: TacticalValidationError[];
}

/**
 * Hard ceilings protecting memory, storage and the canvas renderer.
 * Generous for real drills (11v11 + staff, a dozen phases) but stop payload abuse.
 */
export const TACTICAL_LIMITS = {
  maxPhases: 12,
  maxPlayersPerPhase: 30,
  maxEquipmentPerPhase: 40,
  maxCoachingCues: 20,
  maxCueLength: 300,
  maxTitle: 140,
  maxCategory: 80,
  maxFocusArea: 140,
  maxDescription: 3000,
  maxPhaseTitle: 140,
  maxInstruction: 800,
  maxLabel: 40,
  maxId: 80,
  maxTacticalRole: 60,
} as const;

function checkMaxLength(
  value: string,
  max: number,
  path: string,
  errors: TacticalValidationError[]
): boolean {
  if (value.length > max) {
    errors.push({
      path,
      message: `Value is ${value.length} characters; maximum is ${max}.`,
      code: 'VALUE_TOO_LONG',
      received: value.length,
    });
    return false;
  }
  return true;
}

/** Keeps error payloads small: never echo whole objects/arrays or long strings back to the client. */
function summarizeReceived(val: unknown): unknown {
  if (typeof val === 'string') return val.length > 80 ? `${val.slice(0, 80)}…` : val;
  if (Array.isArray(val)) return `[array(${val.length})]`;
  if (val !== null && typeof val === 'object') return '[object]';
  return val;
}

/**
 * Validates whether a value is a non-null, non-array object.
 */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates and safely normalizes a normalized coordinate (0.0 to 1.0).
 */
export function validateCoordinate(
  val: unknown,
  path: string,
  errors: TacticalValidationError[]
): number | null {
  let num: number;

  if (typeof val === 'number') {
    num = val;
  } else if (typeof val === 'string' && val.trim().length > 0) {
    const parsed = Number(val.trim());
    if (Number.isFinite(parsed)) {
      num = parsed;
    } else {
      errors.push({
        path,
        message: `Coordinate must be a finite number between 0.0 and 1.0.`,
        code: 'INVALID_COORDINATE_TYPE',
        received: val,
      });
      return null;
    }
  } else {
    errors.push({
      path,
      message: `Coordinate must be a number between 0.0 and 1.0.`,
      code: 'INVALID_COORDINATE_TYPE',
      received: val,
    });
    return null;
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    errors.push({
      path,
      message: `Coordinate must not be NaN or Infinity.`,
      code: 'INVALID_COORDINATE_VALUE',
      received: val,
    });
    return null;
  }

  if (num < 0.0 || num > 1.0) {
    errors.push({
      path,
      message: `Coordinate ${num} is out of pitch bounds [0.0, 1.0].`,
      code: 'COORDINATE_OUT_OF_BOUNDS',
      received: num,
    });
    return null;
  }

  // Round to 4 decimal places for clean floating precision
  return Math.round(num * 10000) / 10000;
}

/**
 * Validates and normalizes team role.
 */
export function validateTeamRole(
  val: unknown,
  path: string,
  errors: TacticalValidationError[]
): TeamRole | null {
  if (typeof val !== 'string') {
    errors.push({
      path,
      message: `Player role must be one of: ${VALID_TEAM_ROLES.join(', ')}.`,
      code: 'INVALID_ROLE_TYPE',
      received: val,
    });
    return null;
  }

  const normalized = val.trim().toUpperCase() as TeamRole;
  if (VALID_TEAM_ROLES.includes(normalized)) {
    return normalized;
  }

  errors.push({
    path,
    message: `Invalid player role "${val}". Expected one of: ${VALID_TEAM_ROLES.join(', ')}.`,
    code: 'INVALID_ROLE_VALUE',
    received: val,
  });
  return null;
}

/**
 * Validates and normalizes ball trajectory.
 */
export function validateBallTrajectory(
  val: unknown,
  path: string,
  errors: TacticalValidationError[]
): BallTrajectory | null {
  if (typeof val !== 'string') {
    errors.push({
      path,
      message: `Ball trajectory must be one of: ${VALID_BALL_TRAJECTORIES.join(', ')}.`,
      code: 'INVALID_TRAJECTORY_TYPE',
      received: val,
    });
    return null;
  }

  const normalized = val.trim().toUpperCase() as BallTrajectory;
  if (VALID_BALL_TRAJECTORIES.includes(normalized)) {
    return normalized;
  }

  errors.push({
    path,
    message: `Invalid ball trajectory "${val}". Expected one of: ${VALID_BALL_TRAJECTORIES.join(', ')}.`,
    code: 'INVALID_TRAJECTORY_VALUE',
    received: val,
  });
  return null;
}

/**
 * Validates and normalizes equipment type.
 */
export function validateEquipmentType(
  val: unknown,
  path: string,
  errors: TacticalValidationError[]
): EquipmentType | null {
  if (typeof val !== 'string') {
    errors.push({
      path,
      message: `Equipment type must be one of: ${VALID_EQUIPMENT_TYPES.join(', ')}.`,
      code: 'INVALID_EQUIPMENT_TYPE',
      received: val,
    });
    return null;
  }

  const normalized = val.trim().toUpperCase() as EquipmentType;
  if (VALID_EQUIPMENT_TYPES.includes(normalized)) {
    return normalized;
  }

  errors.push({
    path,
    message: `Invalid equipment type "${val}". Expected one of: ${VALID_EQUIPMENT_TYPES.join(', ')}.`,
    code: 'INVALID_EQUIPMENT_VALUE',
    received: val,
  });
  return null;
}

/**
 * Validates and normalizes a single tactical player.
 */
export function validatePlayer(
  raw: unknown,
  path: string,
  errors: TacticalValidationError[],
  seenPlayerIds: Set<string>
): TacticalPlayer | null {
  if (!isPlainObject(raw)) {
    errors.push({
      path,
      message: `Player must be an object.`,
      code: 'INVALID_PLAYER_STRUCTURE',
      received: raw,
    });
    return null;
  }

  // 1. ID
  if (!raw.id || typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    errors.push({
      path: `${path}.id`,
      message: `Player id is required and must be a non-empty string.`,
      code: 'MISSING_PLAYER_ID',
      received: raw.id,
    });
    return null;
  }
  const id = raw.id.trim();
  if (!checkMaxLength(id, TACTICAL_LIMITS.maxId, `${path}.id`, errors)) return null;

  // Uniqueness check within the phase
  if (seenPlayerIds.has(id)) {
    errors.push({
      path: `${path}.id`,
      message: `Duplicate player id "${id}" in phase. Player IDs must be unique within each phase.`,
      code: 'DUPLICATE_PLAYER_ID',
      received: id,
    });
    return null;
  }
  seenPlayerIds.add(id);

  // 2. Number
  let number: number | null = null;
  if (typeof raw.number === 'number' && Number.isInteger(raw.number) && raw.number >= 1 && raw.number <= 99) {
    number = raw.number;
  } else if (typeof raw.number === 'string' && /^\d+$/.test(raw.number.trim())) {
    const parsed = parseInt(raw.number.trim(), 10);
    if (parsed >= 1 && parsed <= 99) {
      number = parsed;
    }
  }

  if (number === null) {
    errors.push({
      path: `${path}.number`,
      message: `Player jersey number must be an integer between 1 and 99.`,
      code: 'INVALID_PLAYER_NUMBER',
      received: raw.number,
    });
  }

  // 3. Role
  const role = validateTeamRole(raw.role, `${path}.role`, errors);

  // 4. Coordinates
  const x = validateCoordinate(raw.x, `${path}.x`, errors);
  const y = validateCoordinate(raw.y, `${path}.y`, errors);
  const targetX = validateCoordinate(raw.targetX, `${path}.targetX`, errors);
  const targetY = validateCoordinate(raw.targetY, `${path}.targetY`, errors);

  // 5. Label
  let label = '';
  if (typeof raw.label === 'string' && raw.label.trim().length > 0) {
    label = raw.label.trim();
    if (!checkMaxLength(label, TACTICAL_LIMITS.maxLabel, `${path}.label`, errors)) label = '';
  } else {
    errors.push({
      path: `${path}.label`,
      message: `Player label is required and must be a non-empty string.`,
      code: 'MISSING_PLAYER_LABEL',
      received: raw.label,
    });
  }

  // 6. Optional flags
  const hasBall = Boolean(raw.hasBall);
  const tacticalRole =
    typeof raw.tacticalRole === 'string' && raw.tacticalRole.trim()
      ? raw.tacticalRole.trim().slice(0, TACTICAL_LIMITS.maxTacticalRole)
      : undefined;
  const tacticalDuty =
    typeof raw.tacticalDuty === 'string' && raw.tacticalDuty.trim()
      ? raw.tacticalDuty.trim().slice(0, TACTICAL_LIMITS.maxTacticalRole)
      : undefined;

  if (number === null || role === null || x === null || y === null || targetX === null || targetY === null || !label) {
    return null;
  }

  return {
    id,
    number,
    role,
    x,
    y,
    targetX,
    targetY,
    label,
    hasBall,
    ...(tacticalRole ? { tacticalRole } : {}),
    ...(tacticalDuty ? { tacticalDuty } : {}),
  };
}

/**
 * Validates and normalizes the tactical ball.
 */
export function validateBall(
  raw: unknown,
  path: string,
  errors: TacticalValidationError[]
): TacticalBall | null {
  if (!isPlainObject(raw)) {
    errors.push({
      path,
      message: `Ball must be an object.`,
      code: 'INVALID_BALL_STRUCTURE',
      received: raw,
    });
    return null;
  }

  const x = validateCoordinate(raw.x, `${path}.x`, errors);
  const y = validateCoordinate(raw.y, `${path}.y`, errors);
  const targetX = validateCoordinate(raw.targetX, `${path}.targetX`, errors);
  const targetY = validateCoordinate(raw.targetY, `${path}.targetY`, errors);
  const trajectory = validateBallTrajectory(raw.trajectory, `${path}.trajectory`, errors);

  if (x === null || y === null || targetX === null || targetY === null || trajectory === null) {
    return null;
  }

  return {
    x,
    y,
    targetX,
    targetY,
    trajectory,
  };
}

/**
 * Validates and normalizes equipment.
 */
export function validateEquipment(
  raw: unknown,
  path: string,
  errors: TacticalValidationError[],
  seenEquipmentIds: Set<string>
): TacticalEquipment | null {
  if (!isPlainObject(raw)) {
    errors.push({
      path,
      message: `Equipment must be an object.`,
      code: 'INVALID_EQUIPMENT_STRUCTURE',
      received: raw,
    });
    return null;
  }

  if (!raw.id || typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    errors.push({
      path: `${path}.id`,
      message: `Equipment id is required and must be a non-empty string.`,
      code: 'MISSING_EQUIPMENT_ID',
      received: raw.id,
    });
    return null;
  }
  const id = raw.id.trim();
  if (!checkMaxLength(id, TACTICAL_LIMITS.maxId, `${path}.id`, errors)) return null;

  if (seenEquipmentIds.has(id)) {
    errors.push({
      path: `${path}.id`,
      message: `Duplicate equipment id "${id}" in phase.`,
      code: 'DUPLICATE_EQUIPMENT_ID',
      received: id,
    });
    return null;
  }
  seenEquipmentIds.add(id);

  const type = validateEquipmentType(raw.type, `${path}.type`, errors);
  const x = validateCoordinate(raw.x, `${path}.x`, errors);
  const y = validateCoordinate(raw.y, `${path}.y`, errors);

  if (type === null || x === null || y === null) {
    return null;
  }

  return {
    id,
    type,
    x,
    y,
  };
}

/**
 * Validates and normalizes a single drill phase.
 */
export function validatePhase(
  raw: unknown,
  path: string,
  errors: TacticalValidationError[],
  seenSteps: Set<number>
): DrillPhase | null {
  if (!isPlainObject(raw)) {
    errors.push({
      path,
      message: `Phase must be an object.`,
      code: 'INVALID_PHASE_STRUCTURE',
      received: raw,
    });
    return null;
  }

  // 1. Step
  let step: number | null = null;
  if (typeof raw.step === 'number' && Number.isInteger(raw.step) && raw.step >= 1) {
    step = raw.step;
  } else if (typeof raw.step === 'string' && /^\d+$/.test(raw.step.trim())) {
    const parsed = parseInt(raw.step.trim(), 10);
    if (parsed >= 1) step = parsed;
  }

  if (step === null) {
    errors.push({
      path: `${path}.step`,
      message: `Phase step must be a positive integer (e.g., 1, 2, 3).`,
      code: 'INVALID_PHASE_STEP',
      received: raw.step,
    });
  } else if (seenSteps.has(step)) {
    errors.push({
      path: `${path}.step`,
      message: `Duplicate phase step ${step}. Each phase must have a unique sequential step number.`,
      code: 'DUPLICATE_PHASE_STEP',
      received: step,
    });
  } else {
    seenSteps.add(step);
  }

  // 2. Title
  let title = '';
  if (typeof raw.title === 'string' && raw.title.trim().length > 0) {
    title = raw.title.trim();
    if (!checkMaxLength(title, TACTICAL_LIMITS.maxPhaseTitle, `${path}.title`, errors)) title = '';
  } else {
    errors.push({
      path: `${path}.title`,
      message: `Phase title is required and must be a non-empty string.`,
      code: 'MISSING_PHASE_TITLE',
      received: raw.title,
    });
  }

  // 3. Instruction
  let instruction = '';
  if (typeof raw.instruction === 'string' && raw.instruction.trim().length > 0) {
    instruction = raw.instruction.trim();
    if (!checkMaxLength(instruction, TACTICAL_LIMITS.maxInstruction, `${path}.instruction`, errors)) instruction = '';
  } else {
    errors.push({
      path: `${path}.instruction`,
      message: `Phase instruction is required and must be a non-empty string.`,
      code: 'MISSING_PHASE_INSTRUCTION',
      received: raw.instruction,
    });
  }

  // 4. Duration
  let durationSec: number | null = null;
  if (typeof raw.durationSec === 'number') {
    durationSec = raw.durationSec;
  } else if (typeof raw.durationSec === 'string' && raw.durationSec.trim().length > 0) {
    const parsed = Number(raw.durationSec.trim());
    if (Number.isFinite(parsed)) durationSec = parsed;
  }

  if (
    durationSec === null ||
    Number.isNaN(durationSec) ||
    !Number.isFinite(durationSec) ||
    durationSec <= 0.0 ||
    durationSec > 60.0
  ) {
    errors.push({
      path: `${path}.durationSec`,
      message: `Phase durationSec must be a positive number between 0.1 and 60.0 seconds.`,
      code: 'INVALID_PHASE_DURATION',
      received: raw.durationSec,
    });
  } else {
    durationSec = Math.round(durationSec * 10) / 10;
  }

  // 5. Players
  if (!Array.isArray(raw.players)) {
    errors.push({
      path: `${path}.players`,
      message: `Phase players must be an array of player objects.`,
      code: 'INVALID_PLAYERS_ARRAY',
      received: raw.players,
    });
    return null;
  }

  if (raw.players.length === 0) {
    errors.push({
      path: `${path}.players`,
      message: `Phase must contain at least one player.`,
      code: 'EMPTY_PLAYERS_ARRAY',
      received: [],
    });
  }

  if (raw.players.length > TACTICAL_LIMITS.maxPlayersPerPhase) {
    errors.push({
      path: `${path}.players`,
      message: `Phase has ${raw.players.length} players; maximum is ${TACTICAL_LIMITS.maxPlayersPerPhase}.`,
      code: 'TOO_MANY_PLAYERS',
      received: raw.players.length,
    });
    return null;
  }

  const seenPlayerIds = new Set<string>();
  const players: TacticalPlayer[] = [];
  raw.players.forEach((p, idx) => {
    const validatedP = validatePlayer(p, `${path}.players[${idx}]`, errors, seenPlayerIds);
    if (validatedP) players.push(validatedP);
  });

  // 6. Ball
  const ball = validateBall(raw.ball, `${path}.ball`, errors);

  // 7. Equipment (Optional)
  let equipment: TacticalEquipment[] | undefined = undefined;
  if (raw.equipment !== undefined && raw.equipment !== null) {
    if (!Array.isArray(raw.equipment)) {
      errors.push({
        path: `${path}.equipment`,
        message: `Phase equipment, if provided, must be an array.`,
        code: 'INVALID_EQUIPMENT_ARRAY',
        received: raw.equipment,
      });
    } else if (raw.equipment.length > TACTICAL_LIMITS.maxEquipmentPerPhase) {
      errors.push({
        path: `${path}.equipment`,
        message: `Phase has ${raw.equipment.length} equipment items; maximum is ${TACTICAL_LIMITS.maxEquipmentPerPhase}.`,
        code: 'TOO_MANY_EQUIPMENT',
        received: raw.equipment.length,
      });
    } else {
      const seenEquipmentIds = new Set<string>();
      equipment = [];
      raw.equipment.forEach((eq, idx) => {
        const validatedEq = validateEquipment(eq, `${path}.equipment[${idx}]`, errors, seenEquipmentIds);
        if (validatedEq) equipment!.push(validatedEq);
      });
    }
  }

  if (step === null || !title || !instruction || durationSec === null || !ball || players.length === 0) {
    return null;
  }

  return {
    step,
    title,
    instruction,
    durationSec,
    players,
    ball,
    ...(equipment && equipment.length > 0 ? { equipment } : { equipment: [] }),
  };
}

/**
 * Main canonical validation and normalization pipeline.
 *
 * Validates raw data against the CoachTactics tactical domain model.
 * Performs deterministic validation and safe, non-destructive normalization.
 */
export function validateTacticalDrill(raw: unknown): TacticalValidationResult {
  const errors: TacticalValidationError[] = [];

  if (!isPlainObject(raw)) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: 'Tactical drill must be an object.',
          code: 'INVALID_ROOT_TYPE',
          received: summarizeReceived(raw),
        },
      ],
    };
  }

  // 1. Drill ID (normalize if missing)
  let id = `drill_${Date.now()}`;
  if (typeof raw.id === 'string' && raw.id.trim().length > 0 && raw.id.trim().length <= TACTICAL_LIMITS.maxId) {
    id = raw.id.trim();
  }

  // 2. Title
  let title = '';
  if (typeof raw.title === 'string' && raw.title.trim().length > 0) {
    title = raw.title.trim();
    checkMaxLength(title, TACTICAL_LIMITS.maxTitle, 'title', errors);
  } else {
    errors.push({
      path: 'title',
      message: 'Drill title is required and must be a non-empty string.',
      code: 'MISSING_DRILL_TITLE',
      received: raw.title,
    });
  }

  // 3. Category
  let category = '';
  if (typeof raw.category === 'string' && raw.category.trim().length > 0) {
    category = raw.category.trim();
    checkMaxLength(category, TACTICAL_LIMITS.maxCategory, 'category', errors);
  } else {
    errors.push({
      path: 'category',
      message: 'Drill category is required and must be a non-empty string.',
      code: 'MISSING_DRILL_CATEGORY',
      received: raw.category,
    });
  }

  // 4. Focus Area
  let focusArea = '';
  if (typeof raw.focusArea === 'string' && raw.focusArea.trim().length > 0) {
    focusArea = raw.focusArea.trim();
    checkMaxLength(focusArea, TACTICAL_LIMITS.maxFocusArea, 'focusArea', errors);
  } else {
    errors.push({
      path: 'focusArea',
      message: 'Drill focusArea is required and must be a non-empty string.',
      code: 'MISSING_DRILL_FOCUS_AREA',
      received: raw.focusArea,
    });
  }

  // 5. Duration Minutes
  let durationMinutes = 20;
  if (typeof raw.durationMinutes === 'number' && Number.isFinite(raw.durationMinutes) && raw.durationMinutes >= 1) {
    durationMinutes = Math.min(240, Math.max(1, Math.round(raw.durationMinutes)));
  } else if (typeof raw.durationMinutes === 'string' && /^\d+$/.test(raw.durationMinutes.trim())) {
    const parsed = parseInt(raw.durationMinutes.trim(), 10);
    if (parsed >= 1) durationMinutes = Math.min(240, parsed);
  } else if (raw.durationMinutes !== undefined && raw.durationMinutes !== null) {
    errors.push({
      path: 'durationMinutes',
      message: 'Drill durationMinutes must be a positive integer.',
      code: 'INVALID_DRILL_DURATION',
      received: raw.durationMinutes,
    });
  }

  // 6. Pitch View
  let pitchView: PitchViewMode = 'FULL';
  if (typeof raw.pitchView === 'string') {
    const normalized = raw.pitchView.trim().toUpperCase();
    if (VALID_PITCH_VIEWS.includes(normalized as PitchViewMode)) {
      pitchView = normalized as PitchViewMode;
    } else {
      errors.push({
        path: 'pitchView',
        message: `pitchView must be one of: ${VALID_PITCH_VIEWS.join(', ')}.`,
        code: 'INVALID_PITCH_VIEW',
        received: raw.pitchView,
      });
    }
  }

  // 7. Description
  let description = '';
  if (typeof raw.description === 'string' && raw.description.trim().length > 0) {
    description = raw.description.trim();
    checkMaxLength(description, TACTICAL_LIMITS.maxDescription, 'description', errors);
  } else {
    errors.push({
      path: 'description',
      message: 'Drill description is required and must be a non-empty string.',
      code: 'MISSING_DRILL_DESCRIPTION',
      received: raw.description,
    });
  }

  // 8. Coaching Cues
  let coachingCues: string[] = [];
  if (Array.isArray(raw.coachingCues)) {
    coachingCues = raw.coachingCues
      .filter((cue): cue is string => typeof cue === 'string' && cue.trim().length > 0)
      .map((cue) => cue.trim());
  } else if (typeof raw.coachingCues === 'string' && raw.coachingCues.trim().length > 0) {
    coachingCues = [raw.coachingCues.trim()];
  }

  if (coachingCues.length > TACTICAL_LIMITS.maxCoachingCues) {
    errors.push({
      path: 'coachingCues',
      message: `Drill has ${coachingCues.length} coaching cues; maximum is ${TACTICAL_LIMITS.maxCoachingCues}.`,
      code: 'TOO_MANY_CUES',
      received: coachingCues.length,
    });
  }
  coachingCues.forEach((cue, idx) => checkMaxLength(cue, TACTICAL_LIMITS.maxCueLength, `coachingCues[${idx}]`, errors));

  if (coachingCues.length === 0) {
    coachingCues = ['Emphasize crisp passing and rapid spatial transitions'];
  }

  // 9. Phases
  if (!Array.isArray(raw.phases)) {
    errors.push({
      path: 'phases',
      message: 'Drill phases must be an array of phase objects.',
      code: 'INVALID_PHASES_ARRAY',
      received: raw.phases,
    });
    return {
      success: false,
      errors: errors.map((e) => ({ ...e, received: summarizeReceived(e.received) })),
    };
  }

  if (raw.phases.length === 0) {
    errors.push({
      path: 'phases',
      message: 'Drill must contain at least one phase.',
      code: 'EMPTY_PHASES_ARRAY',
      received: [],
    });
  }

  if (raw.phases.length > TACTICAL_LIMITS.maxPhases) {
    errors.push({
      path: 'phases',
      message: `Drill has ${raw.phases.length} phases; maximum is ${TACTICAL_LIMITS.maxPhases}.`,
      code: 'TOO_MANY_PHASES',
      received: raw.phases.length,
    });
    return { success: false, errors: errors.map((e) => ({ ...e, received: summarizeReceived(e.received) })) };
  }

  const seenSteps = new Set<number>();
  const phases: DrillPhase[] = [];
  raw.phases.forEach((ph, idx) => {
    const validatedPhase = validatePhase(ph, `phases[${idx}]`, errors, seenSteps);
    if (validatedPhase) phases.push(validatedPhase);
  });

  // Sort phases by step to guarantee ordered sequencing
  phases.sort((a, b) => a.step - b.step);

  if (errors.length > 0) {
    return {
      success: false,
      errors: errors.map((e) => ({ ...e, received: summarizeReceived(e.received) })),
    };
  }

  const normalizedDrill: SoccerDrill = {
    id,
    title,
    category,
    focusArea,
    durationMinutes,
    pitchView,
    description,
    coachingCues,
    phases,
    createdByRole: typeof raw.createdByRole === 'string' ? raw.createdByRole : undefined,
    createdByUsername: typeof raw.createdByUsername === 'string' ? raw.createdByUsername : undefined,
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : undefined,
    isCached: Boolean(raw.isCached),
    cacheSource: typeof raw.cacheSource === 'string' ? (raw.cacheSource as any) : undefined,
    quotaSaved: raw.quotaSaved !== undefined ? Boolean(raw.quotaSaved) : undefined,
  };

  return {
    success: true,
    drill: normalizedDrill,
  };
}
