// CoachTactics — deterministic "fast change" transforms.
// Pure functions: input drill is never mutated. Each change is idempotent
// (applying it twice does not stack duplicate players/equipment).

export const FAST_CHANGE_TYPES = [
  '+1 Defender Press',
  'Fullback Overlap',
  'Add 2 Mini-Goals',
  'Add Cones & Grid',
  'Flip Pitch View',
] as const;

export type FastChangeType = (typeof FAST_CHANGE_TYPES)[number];

export interface FastChangeResult {
  drill: any;
  changed: boolean;
  message: string;
}

const clampPitch = (v: number) => Math.min(0.98, Math.max(0.02, v));

export function isFastChangeType(v: unknown): v is FastChangeType {
  return typeof v === 'string' && (FAST_CHANGE_TYPES as readonly string[]).includes(v);
}

function isRightBack(p: any): boolean {
  if (p?.role !== 'ATTACK') return false;
  const label = typeof p.label === 'string' ? p.label : '';
  if (/\bRB\b|\bRWB\b|right[\s-]?back/i.test(label)) return true;
  // Jersey #2 exactly (not #20–#29) when no positional label is present
  return p.number === 2 && !/\b(CB|LB|LWB|CM|DM|AM|ST|LW|RW|GK)\b/i.test(label);
}

function upsertEquipment(phase: any, items: { id: string; type: string; x: number; y: number }[]): boolean {
  phase.equipment = Array.isArray(phase.equipment) ? phase.equipment : [];
  let added = false;
  for (const item of items) {
    if (!phase.equipment.some((e: any) => e.id === item.id)) {
      phase.equipment.push(item);
      added = true;
    }
  }
  return added;
}

export function applyFastChange(input: any, changeType: FastChangeType): FastChangeResult {
  const drill = JSON.parse(JSON.stringify(input));
  drill.coachingCues = Array.isArray(drill.coachingCues) ? drill.coachingCues : [];
  drill.phases = Array.isArray(drill.phases) ? drill.phases : [];
  let changed = false;

  switch (changeType) {
    case '+1 Defender Press': {
      const presserId = 'press_def_extra';
      drill.phases.forEach((phase: any, idx: number) => {
        if (!Array.isArray(phase.players) || !phase.ball) return;
        if (phase.players.some((p: any) => p.id === presserId)) return;
        const used = new Set(phase.players.filter((p: any) => p.role === 'DEFENSE').map((p: any) => p.number));
        let number = 99;
        while (used.has(number) && number > 1) number--;
        const bx = Number(phase.ball.x) || 0.5;
        const by = Number(phase.ball.y) || 0.5;
        phase.players.push({
          id: presserId,
          number,
          role: 'DEFENSE',
          // Start goal-side of the ball (attacking goal is y = 0) and close down the receiver
          x: clampPitch(bx + (idx % 2 === 0 ? 0.08 : -0.08)),
          y: clampPitch(by - 0.08),
          targetX: clampPitch(bx),
          targetY: clampPitch(by),
          label: `Press #${number}`,
        });
        changed = true;
      });
      const cue = 'Apply immediate direct pressure on ball receiver';
      if (changed && !drill.coachingCues.includes(cue)) drill.coachingCues.push(cue);
      return { drill, changed, message: changed ? 'Added a pressing defender to each phase.' : 'Pressing defender already present.' };
    }

    case 'Fullback Overlap': {
      drill.phases.forEach((phase: any) => {
        const rb = (phase.players || []).find(isRightBack);
        if (!rb) return;
        const nextX = 0.92;
        const nextY = clampPitch(Math.max(0.15, rb.targetY - 0.15));
        if (rb.targetX !== nextX || rb.targetY !== nextY) {
          rb.targetX = nextX;
          rb.targetY = nextY;
          changed = true;
        }
      });
      return {
        drill,
        changed,
        message: changed ? 'Right back now overlaps on the outside.' : 'No right back found (label "RB" or jersey #2 on the attacking team).',
      };
    }

    case 'Add 2 Mini-Goals': {
      drill.phases.forEach((phase: any) => {
        if (
          upsertEquipment(phase, [
            { id: 'mini_goal_left', type: 'MINI_GOAL', x: 0.25, y: 0.9 },
            { id: 'mini_goal_right', type: 'MINI_GOAL', x: 0.75, y: 0.9 },
          ])
        ) {
          changed = true;
        }
      });
      return { drill, changed, message: changed ? 'Added two counter mini-goals.' : 'Mini-goals already placed.' };
    }

    case 'Add Cones & Grid': {
      drill.phases.forEach((phase: any) => {
        if (
          upsertEquipment(phase, [
            { id: 'grid_cone_tl', type: 'CONE', x: 0.25, y: 0.3 },
            { id: 'grid_cone_tr', type: 'CONE', x: 0.75, y: 0.3 },
            { id: 'grid_cone_bl', type: 'CONE', x: 0.25, y: 0.7 },
            { id: 'grid_cone_br', type: 'CONE', x: 0.75, y: 0.7 },
          ])
        ) {
          changed = true;
        }
      });
      return { drill, changed, message: changed ? 'Added a 4-cone grid.' : 'Cone grid already placed.' };
    }

    case 'Flip Pitch View': {
      drill.pitchView = drill.pitchView === 'HALF' ? 'FULL' : 'HALF';
      return { drill, changed: true, message: `Switched to ${drill.pitchView} pitch view.` };
    }
  }
}
