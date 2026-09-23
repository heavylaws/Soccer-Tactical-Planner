// CoachTactics — repair pass for LLM-generated drills.
//
// The strict validator is right to reject malformed data from users. But LLM output fails it for
// trivial reasons (x = 1.02, duplicate ids, step numbers starting at 0, "DEFENDER" instead of
// "DEFENSE"), and before this pass each such miss silently fell back to the offline template.
// This function fixes only mechanical defects; tactical content is never invented.

import { TACTICAL_LIMITS } from './tacticalValidator.ts';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function coord(v: unknown, fallback: number, lo = 0.02, hi = 0.98): number {
  const n = num(v);
  if (n === null) return fallback;
  // Some models answer in percent (0–100) despite instructions.
  const scaled = n > 1.5 && n <= 100 ? n / 100 : n;
  return Math.round(clamp(scaled, lo, hi) * 10000) / 10000;
}

function text(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const ROLE_SYNONYMS: Record<string, string> = {
  ATTACK: 'ATTACK',
  ATTACKER: 'ATTACK',
  ATTACKING: 'ATTACK',
  OFFENSE: 'ATTACK',
  HOME: 'ATTACK',
  DEFENSE: 'DEFENSE',
  DEFENCE: 'DEFENSE',
  DEFENDER: 'DEFENSE',
  DEFENDING: 'DEFENSE',
  OPPONENT: 'DEFENSE',
  AWAY: 'DEFENSE',
  GOALKEEPER: 'GOALKEEPER',
  KEEPER: 'GOALKEEPER',
  GK: 'GOALKEEPER',
  NEUTRAL: 'NEUTRAL',
  JOKER: 'NEUTRAL',
  FLOATER: 'NEUTRAL',
};

const TRAJECTORY_SYNONYMS: Record<string, string> = {
  GROUND_PASS: 'GROUND_PASS',
  PASS: 'GROUND_PASS',
  GROUND: 'GROUND_PASS',
  THROUGH_BALL: 'GROUND_PASS',
  AERIAL_PASS: 'AERIAL_PASS',
  AERIAL: 'AERIAL_PASS',
  CROSS: 'AERIAL_PASS',
  LOB: 'AERIAL_PASS',
  CHIP: 'AERIAL_PASS',
  LONG_BALL: 'AERIAL_PASS',
  DRIBBLE: 'DRIBBLE',
  CARRY: 'DRIBBLE',
  RUN: 'DRIBBLE',
  SHOT: 'SHOT',
  SHOOT: 'SHOT',
  FINISH: 'SHOT',
};

const EQUIPMENT_SYNONYMS: Record<string, string> = {
  CONE: 'CONE',
  MARKER: 'CONE',
  MINI_GOAL: 'MINI_GOAL',
  MINIGOAL: 'MINI_GOAL',
  GOAL: 'MINI_GOAL',
  POP_UP_GOAL: 'MINI_GOAL',
  MANNEQUIN: 'MANNEQUIN',
  DUMMY: 'MANNEQUIN',
  AGILITY_LADDER: 'AGILITY_LADDER',
  LADDER: 'AGILITY_LADDER',
};

function enumValue(v: unknown, table: Record<string, string>, fallback: string | null): string | null {
  if (typeof v !== 'string') return fallback;
  const key = v.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return table[key] ?? fallback;
}

function uniqueId(base: string, seen: Set<string>): string {
  let id = base.slice(0, TACTICAL_LIMITS.maxId);
  let n = 2;
  while (seen.has(id)) id = `${base.slice(0, TACTICAL_LIMITS.maxId - 4)}_${n++}`;
  seen.add(id);
  return id;
}

function repairPlayer(raw: unknown, idx: number, seenIds: Set<string>): Obj | null {
  if (!isObj(raw)) return null;
  const role = enumValue(raw.role, ROLE_SYNONYMS, null);
  if (!role) return null; // unknown team affiliation: drop rather than guess

  const x = coord(raw.x, 0.5);
  const y = coord(raw.y, 0.5);
  const numberRaw = num(raw.number);
  const number = numberRaw !== null ? clamp(Math.round(numberRaw), 1, 99) : clamp(idx + 1, 1, 99);
  const baseId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `p${idx + 1}`;

  return {
    id: uniqueId(baseId, seenIds),
    number,
    role,
    x,
    y,
    targetX: coord(raw.targetX, x),
    targetY: coord(raw.targetY, y),
    label: text(raw.label, TACTICAL_LIMITS.maxLabel) ?? `#${number}`,
    hasBall: raw.hasBall === true,
    ...(text(raw.tacticalRole, TACTICAL_LIMITS.maxTacticalRole) ? { tacticalRole: text(raw.tacticalRole, TACTICAL_LIMITS.maxTacticalRole) } : {}),
    ...(text(raw.tacticalDuty, TACTICAL_LIMITS.maxTacticalRole) ? { tacticalDuty: text(raw.tacticalDuty, TACTICAL_LIMITS.maxTacticalRole) } : {}),
  };
}

function repairBall(raw: unknown, players: Obj[]): Obj {
  const carrier = players.find((p) => p.hasBall === true) ?? players[0];
  const cx = (carrier?.x as number) ?? 0.5;
  const cy = (carrier?.y as number) ?? 0.5;
  const b = isObj(raw) ? raw : {};
  const x = coord(b.x, cx, 0, 1);
  const y = coord(b.y, cy, 0, 1);
  return {
    x,
    y,
    targetX: coord(b.targetX, x, 0, 1),
    targetY: coord(b.targetY, y, 0, 1),
    trajectory: enumValue(b.trajectory, TRAJECTORY_SYNONYMS, 'GROUND_PASS'),
  };
}

function repairEquipment(raw: unknown): Obj[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Obj[] = [];
  raw.slice(0, TACTICAL_LIMITS.maxEquipmentPerPhase).forEach((eq, idx) => {
    if (!isObj(eq)) return;
    const type = enumValue(eq.type, EQUIPMENT_SYNONYMS, null);
    if (!type) return;
    const baseId = typeof eq.id === 'string' && eq.id.trim() ? eq.id.trim() : `eq${idx + 1}`;
    out.push({ id: uniqueId(baseId, seen), type, x: coord(eq.x, 0.5, 0, 1), y: coord(eq.y, 0.5, 0, 1) });
  });
  return out;
}

export function repairAiDrill(raw: unknown): unknown {
  if (!isObj(raw)) return raw;

  const phasesRaw = Array.isArray(raw.phases) ? raw.phases.filter(isObj) : [];
  // Keep the model's intended order when step numbers are sane, then renumber 1..n.
  const ordered = [...phasesRaw].sort((a, b) => (num(a.step) ?? 0) - (num(b.step) ?? 0));

  const phases = ordered.slice(0, TACTICAL_LIMITS.maxPhases).map((ph, idx) => {
    const seenIds = new Set<string>();
    const playersRaw = Array.isArray(ph.players) ? ph.players : [];
    const players = playersRaw
      .slice(0, TACTICAL_LIMITS.maxPlayersPerPhase)
      .map((p, pIdx) => repairPlayer(p, pIdx, seenIds))
      .filter((p): p is Obj => p !== null);

    const duration = num(ph.durationSec);
    const title = text(ph.title, TACTICAL_LIMITS.maxPhaseTitle) ?? `Phase ${idx + 1}`;
    return {
      step: idx + 1,
      title,
      instruction: text(ph.instruction, TACTICAL_LIMITS.maxInstruction) ?? title,
      durationSec: duration !== null ? clamp(duration, 1.5, 8) : 2.8,
      players,
      ball: repairBall(ph.ball, players),
      equipment: repairEquipment(ph.equipment),
    };
  });

  const cues = Array.isArray(raw.coachingCues)
    ? raw.coachingCues
        .map((c) => text(c, TACTICAL_LIMITS.maxCueLength))
        .filter((c): c is string => Boolean(c))
        .slice(0, TACTICAL_LIMITS.maxCoachingCues)
    : raw.coachingCues;

  const duration = num(raw.durationMinutes);
  const pitchView = typeof raw.pitchView === 'string' && raw.pitchView.trim().toUpperCase() === 'HALF' ? 'HALF' : 'FULL';

  return {
    ...raw,
    title: text(raw.title, TACTICAL_LIMITS.maxTitle) ?? raw.title,
    category: text(raw.category, TACTICAL_LIMITS.maxCategory) ?? raw.category,
    focusArea: text(raw.focusArea, TACTICAL_LIMITS.maxFocusArea) ?? raw.focusArea,
    description: text(raw.description, TACTICAL_LIMITS.maxDescription) ?? raw.description,
    durationMinutes: duration !== null ? clamp(Math.round(duration), 5, 120) : 20,
    pitchView,
    coachingCues: cues,
    phases,
  };
}
