// CoachTactics Server-Side Drill Repository Abstraction
// Note: This in-memory repository implementation provides the isolated persistence boundary
// for development and automated testing. It strictly implements IDrillRepository so a future
// durable SQL/Postgres/CloudSQL or Firestore database can be swapped in without modifying
// any drill service or API route contracts.

import path from 'path';
import { StoredDrill } from './drillDomain.ts';
import { config } from '../config.ts';
import { readJsonFile, DebouncedJsonWriter } from '../storage/jsonFileStore.ts';

export interface IDrillRepository {
  findById(id: string): Promise<StoredDrill | null>;
  findByCreator(userId: string): Promise<StoredDrill[]>;
  findSystemDrills(): Promise<StoredDrill[]>;
  findAll(): Promise<StoredDrill[]>;
  create(drill: StoredDrill): Promise<StoredDrill>;
  update(id: string, drill: StoredDrill): Promise<StoredDrill>;
  delete(id: string): Promise<boolean>;
  resetForTesting(): void;
}

export class InMemoryDrillRepository implements IDrillRepository {
  protected drills = new Map<string, StoredDrill>();

  constructor() {
    this.seedDefaultSystemDrills();
  }

  private seedDefaultSystemDrills(): void {
    const defaultSystemDrills: StoredDrill[] = [
      {
        id: 'drill_overlap_wing',
        title: 'Overlapping Wing Delivery & Box Attack',
        category: 'Attacking Patterns',
        focusArea: 'Wide Overload & Timing of Runs',
        durationMinutes: 15,
        pitchView: 'HALF',
        description: 'Midfield pivot releases winger, fullback overlaps at pace to deliver low cross for striker near-post finish.',
        coachingCues: [
          'Fullback triggers sprint before ball reaches winger',
          'Firm diagonal pass into running path',
          'Striker attacks near post, opposite winger attacks far post',
          'Quality of cutback cross behind defending line',
        ],
        createdBy: 'system',
        createdByUsername: 'system',
        createdByRole: 'HEAD_COACH',
        ownerId: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'system',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        isSystem: true,
        phases: [
          {
            step: 1,
            title: 'Phase 1: Pivot Build-Up',
            instruction: 'CM (#8) collects from deep, scans wide option and triggers wing movement.',
            durationSec: 2.6,
            players: [
              { id: 'cm8', number: 8, role: 'ATTACK', x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, label: 'CM #8', hasBall: true },
              { id: 'w7', number: 7, role: 'ATTACK', x: 0.80, y: 0.62, targetX: 0.75, targetY: 0.55, label: 'RW #7' },
              { id: 'rb2', number: 2, role: 'ATTACK', x: 0.85, y: 0.82, targetX: 0.88, targetY: 0.65, label: 'RB #2' },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.48, y: 0.40, targetX: 0.52, targetY: 0.35, label: 'ST #9' },
              { id: 'cam10', number: 10, role: 'ATTACK', x: 0.35, y: 0.50, targetX: 0.38, targetY: 0.42, label: 'AM #10' },
              { id: 'def4', number: 4, role: 'DEFENSE', x: 0.45, y: 0.32, targetX: 0.48, targetY: 0.30, label: 'CB #4' },
              { id: 'def5', number: 5, role: 'DEFENSE', x: 0.65, y: 0.35, targetX: 0.68, targetY: 0.32, label: 'LB #5' },
              { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.12, targetX: 0.50, targetY: 0.14, label: 'GK #1' },
            ],
            ball: { x: 0.50, y: 0.78, targetX: 0.50, targetY: 0.72, trajectory: 'DRIBBLE' },
            equipment: [
              { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
              { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
            ],
          },
          {
            step: 2,
            title: 'Phase 2: Overlapping Release',
            instruction: 'CM slips pass to winger who holds up while fullback (#2) accelerates on outside overlap.',
            durationSec: 2.8,
            players: [
              { id: 'cm8', number: 8, role: 'ATTACK', x: 0.50, y: 0.72, targetX: 0.55, targetY: 0.60, label: 'CM #8' },
              { id: 'w7', number: 7, role: 'ATTACK', x: 0.75, y: 0.55, targetX: 0.78, targetY: 0.48, label: 'RW #7', hasBall: true },
              { id: 'rb2', number: 2, role: 'ATTACK', x: 0.88, y: 0.65, targetX: 0.90, targetY: 0.38, label: 'RB #2' },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.52, y: 0.35, targetX: 0.50, targetY: 0.28, label: 'ST #9' },
              { id: 'cam10', number: 10, role: 'ATTACK', x: 0.38, y: 0.42, targetX: 0.40, targetY: 0.32, label: 'AM #10' },
              { id: 'def4', number: 4, role: 'DEFENSE', x: 0.48, y: 0.30, targetX: 0.50, targetY: 0.26, label: 'CB #4' },
              { id: 'def5', number: 5, role: 'DEFENSE', x: 0.68, y: 0.32, targetX: 0.78, targetY: 0.45, label: 'LB #5' },
              { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.14, targetX: 0.50, targetY: 0.15, label: 'GK #1' },
            ],
            ball: { x: 0.50, y: 0.72, targetX: 0.78, targetY: 0.48, trajectory: 'GROUND_PASS' },
            equipment: [
              { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
              { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
            ],
          },
          {
            step: 3,
            title: 'Phase 3: Byline Delivery',
            instruction: 'Winger drops weight and threads to sprinting fullback (#2) hitting the byline.',
            durationSec: 2.8,
            players: [
              { id: 'cm8', number: 8, role: 'ATTACK', x: 0.55, y: 0.60, targetX: 0.58, targetY: 0.45, label: 'CM #8' },
              { id: 'w7', number: 7, role: 'ATTACK', x: 0.78, y: 0.48, targetX: 0.72, targetY: 0.38, label: 'RW #7' },
              { id: 'rb2', number: 2, role: 'ATTACK', x: 0.90, y: 0.38, targetX: 0.88, targetY: 0.20, label: 'RB #2', hasBall: true },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.28, targetX: 0.45, targetY: 0.18, label: 'ST #9' },
              { id: 'cam10', number: 10, role: 'ATTACK', x: 0.40, y: 0.32, targetX: 0.35, targetY: 0.22, label: 'AM #10' },
              { id: 'def4', number: 4, role: 'DEFENSE', x: 0.50, y: 0.26, targetX: 0.48, targetY: 0.20, label: 'CB #4' },
              { id: 'def5', number: 5, role: 'DEFENSE', x: 0.78, y: 0.45, targetX: 0.82, targetY: 0.28, label: 'LB #5' },
              { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.15, targetX: 0.55, targetY: 0.14, label: 'GK #1' },
            ],
            ball: { x: 0.78, y: 0.48, targetX: 0.88, targetY: 0.20, trajectory: 'GROUND_PASS' },
            equipment: [
              { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
              { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
            ],
          },
          {
            step: 4,
            title: 'Phase 4: Near-Post Dart & Finish',
            instruction: 'Fullback whips driven low cross to #9 cutting across CB for one-touch finish!',
            durationSec: 2.6,
            players: [
              { id: 'cm8', number: 8, role: 'ATTACK', x: 0.58, y: 0.45, targetX: 0.58, targetY: 0.35, label: 'CM #8' },
              { id: 'w7', number: 7, role: 'ATTACK', x: 0.72, y: 0.38, targetX: 0.70, targetY: 0.28, label: 'RW #7' },
              { id: 'rb2', number: 2, role: 'ATTACK', x: 0.88, y: 0.20, targetX: 0.85, targetY: 0.18, label: 'RB #2' },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.45, y: 0.18, targetX: 0.50, targetY: 0.10, label: 'ST #9', hasBall: true },
              { id: 'cam10', number: 10, role: 'ATTACK', x: 0.35, y: 0.22, targetX: 0.30, targetY: 0.15, label: 'AM #10' },
              { id: 'def4', number: 4, role: 'DEFENSE', x: 0.48, y: 0.20, targetX: 0.49, targetY: 0.13, label: 'CB #4' },
              { id: 'def5', number: 5, role: 'DEFENSE', x: 0.82, y: 0.28, targetX: 0.75, targetY: 0.20, label: 'LB #5' },
              { id: 'gk1', number: 1, role: 'GOALKEEPER', x: 0.55, y: 0.14, targetX: 0.50, targetY: 0.08, label: 'GK #1' },
            ],
            ball: { x: 0.88, y: 0.20, targetX: 0.50, targetY: 0.08, trajectory: 'SHOT' },
            equipment: [
              { id: 'cone1', type: 'CONE', x: 0.30, y: 0.50 },
              { id: 'cone2', type: 'CONE', x: 0.70, y: 0.50 },
            ],
          },
        ],
      },
      {
        id: 'drill_gegenpress_trap',
        title: 'Gegenpressing Midfield Trap & Vertical Break',
        category: 'Defensive Transitions',
        focusArea: 'Trap Triggers & Convergence',
        durationMinutes: 20,
        pitchView: 'FULL',
        description: 'Bait opponent holding pivot into half-turn, snap 3-man pressing trap, and immediately launch vertical transition.',
        coachingCues: [
          'Trigger press when opponent receiver turns back towards goal',
          'Simultaneous 3-player angle convergence to cut passing lanes',
          'First touch upon winning ball must be forward into space',
          'Striker makes immediate diagonal run on blind side',
        ],
        createdBy: 'system',
        createdByUsername: 'system',
        createdByRole: 'HEAD_COACH',
        ownerId: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'system',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        isSystem: true,
        phases: [
          {
            step: 1,
            title: 'Phase 1: Setting the Trap',
            instruction: 'Allow opponent #6 to receive in deep midfield; pressing unit coordinates posture.',
            durationSec: 2.8,
            players: [
              { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, label: 'Opp #6', hasBall: true },
              { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.35, y: 0.70, targetX: 0.36, targetY: 0.68, label: 'Opp CB #4' },
              { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.65, y: 0.70, targetX: 0.64, targetY: 0.68, label: 'Opp CB #5' },
              { id: 'press8', number: 8, role: 'ATTACK', x: 0.52, y: 0.42, targetX: 0.50, targetY: 0.48, label: 'Press #8' },
              { id: 'press10', number: 10, role: 'ATTACK', x: 0.38, y: 0.45, targetX: 0.42, targetY: 0.50, label: 'Press #10' },
              { id: 'press9', number: 9, role: 'ATTACK', x: 0.62, y: 0.45, targetX: 0.58, targetY: 0.48, label: 'Press #9' },
              { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.90, targetX: 0.50, targetY: 0.88, label: 'Opp GK' },
            ],
            ball: { x: 0.50, y: 0.55, targetX: 0.50, targetY: 0.52, trajectory: 'DRIBBLE' },
          },
          {
            step: 2,
            title: 'Phase 2: Snapping the Trap',
            instruction: 'Opp #6 turns into pressure; #8 and #10 converge simultaneously to dispossess.',
            durationSec: 2.5,
            players: [
              { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.52, targetX: 0.50, targetY: 0.52, label: 'Opp #6' },
              { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.36, y: 0.68, targetX: 0.35, targetY: 0.65, label: 'Opp CB #4' },
              { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.64, y: 0.68, targetX: 0.65, targetY: 0.65, label: 'Opp CB #5' },
              { id: 'press8', number: 8, role: 'ATTACK', x: 0.50, y: 0.48, targetX: 0.51, targetY: 0.52, label: 'Press #8', hasBall: true },
              { id: 'press10', number: 10, role: 'ATTACK', x: 0.42, y: 0.50, targetX: 0.47, targetY: 0.52, label: 'Press #10' },
              { id: 'press9', number: 9, role: 'ATTACK', x: 0.58, y: 0.48, targetX: 0.62, targetY: 0.35, label: 'Press #9' },
              { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.88, label: 'Opp GK' },
            ],
            ball: { x: 0.50, y: 0.52, targetX: 0.51, targetY: 0.52, trajectory: 'GROUND_PASS' },
          },
          {
            step: 3,
            title: 'Phase 3: Immediate Vertical Counter',
            instruction: '#8 wins possession and punches instant through-ball to sprinting #9 behind CBs!',
            durationSec: 2.8,
            players: [
              { id: 'opp6', number: 6, role: 'DEFENSE', x: 0.50, y: 0.52, targetX: 0.48, targetY: 0.54, label: 'Opp #6' },
              { id: 'opp4', number: 4, role: 'DEFENSE', x: 0.35, y: 0.65, targetX: 0.42, targetY: 0.50, label: 'Opp CB #4' },
              { id: 'opp5', number: 5, role: 'DEFENSE', x: 0.65, y: 0.65, targetX: 0.58, targetY: 0.50, label: 'Opp CB #5' },
              { id: 'press8', number: 8, role: 'ATTACK', x: 0.51, y: 0.52, targetX: 0.51, targetY: 0.45, label: 'Press #8' },
              { id: 'press10', number: 10, role: 'ATTACK', x: 0.47, y: 0.52, targetX: 0.45, targetY: 0.38, label: 'Press #10' },
              { id: 'press9', number: 9, role: 'ATTACK', x: 0.62, y: 0.35, targetX: 0.55, targetY: 0.18, label: 'Press #9', hasBall: true },
              { id: 'oppGk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.88, targetX: 0.50, targetY: 0.85, label: 'Opp GK' },
            ],
            ball: { x: 0.51, y: 0.52, targetX: 0.55, targetY: 0.18, trajectory: 'GROUND_PASS' },
          },
        ],
      },
      {
        id: 'drill_counter_attack',
        title: '3-Phase Counter-Attack Direct Break',
        category: 'Transitions',
        focusArea: 'Direct Counter & Rapid Overload',
        durationMinutes: 18,
        pitchView: 'FULL',
        description: 'Turnover in defensive third quickly launched with diagonal ball to winger, followed by far-post tap in.',
        coachingCues: [
          'Maximum 3 touches per player during transition',
          'Sprint hard to create 3v2 overload before defense recovers',
          'Firm cutback across the 6-yard box',
        ],
        createdBy: 'system',
        createdByUsername: 'system',
        createdByRole: 'HEAD_COACH',
        ownerId: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'system',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        isSystem: true,
        phases: [
          {
            step: 1,
            title: 'Phase 1: Turnover & Outlet Pass',
            instruction: 'Defending CB wins ball, turns and plays rapid 30-yard diagonal to sprinting winger.',
            durationSec: 3.0,
            players: [
              { id: 'cb4', number: 4, role: 'ATTACK', x: 0.45, y: 0.85, targetX: 0.45, targetY: 0.78, label: 'CB #4', hasBall: true },
              { id: 'cm6', number: 6, role: 'ATTACK', x: 0.50, y: 0.70, targetX: 0.45, targetY: 0.55, label: 'CM #6' },
              { id: 'w11', number: 11, role: 'ATTACK', x: 0.20, y: 0.65, targetX: 0.18, targetY: 0.35, label: 'LW #11' },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.50, targetX: 0.50, targetY: 0.25, label: 'ST #9' },
              { id: 'd2', number: 2, role: 'DEFENSE', x: 0.30, y: 0.45, targetX: 0.25, targetY: 0.32, label: 'Opp RB' },
              { id: 'd3', number: 3, role: 'DEFENSE', x: 0.60, y: 0.45, targetX: 0.52, targetY: 0.28, label: 'Opp CB' },
              { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.08, targetX: 0.50, targetY: 0.12, label: 'GK' },
            ],
            ball: { x: 0.45, y: 0.85, targetX: 0.18, targetY: 0.35, trajectory: 'AERIAL_PASS' },
          },
          {
            step: 2,
            title: 'Phase 2: Driving into Half-Space',
            instruction: 'LW controls in stride, commits the recovering defender, and spots striker attacking penalty spot.',
            durationSec: 2.8,
            players: [
              { id: 'cb4', number: 4, role: 'ATTACK', x: 0.45, y: 0.78, targetX: 0.50, targetY: 0.65, label: 'CB #4' },
              { id: 'cm6', number: 6, role: 'ATTACK', x: 0.45, y: 0.55, targetX: 0.42, targetY: 0.32, label: 'CM #6' },
              { id: 'w11', number: 11, role: 'ATTACK', x: 0.18, y: 0.35, targetX: 0.25, targetY: 0.20, label: 'LW #11', hasBall: true },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.50, y: 0.25, targetX: 0.48, targetY: 0.15, label: 'ST #9' },
              { id: 'd2', number: 2, role: 'DEFENSE', x: 0.25, y: 0.32, targetX: 0.28, targetY: 0.22, label: 'Opp RB' },
              { id: 'd3', number: 3, role: 'DEFENSE', x: 0.52, y: 0.28, targetX: 0.48, targetY: 0.18, label: 'Opp CB' },
              { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.50, y: 0.12, targetX: 0.45, targetY: 0.10, label: 'GK' },
            ],
            ball: { x: 0.18, y: 0.35, targetX: 0.25, targetY: 0.20, trajectory: 'DRIBBLE' },
          },
          {
            step: 3,
            title: 'Phase 3: Squared Pass & Finish',
            instruction: 'Cutback across face of goal, striker slots into bottom corner!',
            durationSec: 2.5,
            players: [
              { id: 'cb4', number: 4, role: 'ATTACK', x: 0.50, y: 0.65, targetX: 0.50, targetY: 0.60, label: 'CB #4' },
              { id: 'cm6', number: 6, role: 'ATTACK', x: 0.42, y: 0.32, targetX: 0.40, targetY: 0.25, label: 'CM #6' },
              { id: 'w11', number: 11, role: 'ATTACK', x: 0.25, y: 0.20, targetX: 0.28, targetY: 0.16, label: 'LW #11' },
              { id: 'st9', number: 9, role: 'ATTACK', x: 0.48, y: 0.15, targetX: 0.48, targetY: 0.08, label: 'ST #9', hasBall: true },
              { id: 'd2', number: 2, role: 'DEFENSE', x: 0.28, y: 0.22, targetX: 0.30, targetY: 0.16, label: 'Opp RB' },
              { id: 'd3', number: 3, role: 'DEFENSE', x: 0.48, y: 0.18, targetX: 0.46, targetY: 0.11, label: 'Opp CB' },
              { id: 'gk', number: 1, role: 'GOALKEEPER', x: 0.45, y: 0.10, targetX: 0.48, targetY: 0.05, label: 'GK' },
            ],
            ball: { x: 0.25, y: 0.20, targetX: 0.48, targetY: 0.05, trajectory: 'SHOT' },
          },
        ],
      },
    ];

    for (const drill of defaultSystemDrills) {
      this.drills.set(drill.id, drill);
    }
  }

  async findById(id: string): Promise<StoredDrill | null> {
    const drill = this.drills.get(id);
    return drill ? JSON.parse(JSON.stringify(drill)) : null;
  }

  async findByCreator(userId: string): Promise<StoredDrill[]> {
    const results: StoredDrill[] = [];
    for (const drill of this.drills.values()) {
      if (drill.createdBy === userId) {
        results.push(JSON.parse(JSON.stringify(drill)));
      }
    }
    return results;
  }

  async findSystemDrills(): Promise<StoredDrill[]> {
    const results: StoredDrill[] = [];
    for (const drill of this.drills.values()) {
      if (drill.isSystem) {
        results.push(JSON.parse(JSON.stringify(drill)));
      }
    }
    return results;
  }

  async findAll(): Promise<StoredDrill[]> {
    return Array.from(this.drills.values()).map((d) => JSON.parse(JSON.stringify(d)));
  }

  async create(drill: StoredDrill): Promise<StoredDrill> {
    const clone = JSON.parse(JSON.stringify(drill));
    this.drills.set(drill.id, clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async update(id: string, drill: StoredDrill): Promise<StoredDrill> {
    const clone = JSON.parse(JSON.stringify(drill));
    this.drills.set(id, clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async delete(id: string): Promise<boolean> {
    return this.drills.delete(id);
  }

  resetForTesting(): void {
    this.drills.clear();
    this.seedDefaultSystemDrills();
  }
}

/**
 * JSON-file-backed repository. System drills are always re-seeded from code (so code updates
 * reach them); only user drills are persisted to disk.
 */
export class FileDrillRepository extends InMemoryDrillRepository {
  private readonly writer: DebouncedJsonWriter;

  constructor(private readonly file: string) {
    super();
    const data = readJsonFile<{ drills?: StoredDrill[] }>(file, {});
    for (const d of data.drills ?? []) {
      if (d && typeof d.id === 'string' && typeof d.createdBy === 'string' && Array.isArray(d.phases) && !d.isSystem) {
        this.drills.set(d.id, d);
      }
    }
    this.writer = new DebouncedJsonWriter(file, () => ({
      version: 1,
      drills: Array.from(this.drills.values()).filter((d) => !d.isSystem),
    }));
  }

  override async create(drill: StoredDrill): Promise<StoredDrill> {
    const result = await super.create(drill);
    this.writer.schedule();
    return result;
  }

  override async update(id: string, drill: StoredDrill): Promise<StoredDrill> {
    const result = await super.update(id, drill);
    this.writer.schedule();
    return result;
  }

  override async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    this.writer.schedule();
    return result;
  }

  /** Force pending writes to disk (used by tests and shutdown hooks). */
  flush(): void {
    this.writer.flush();
  }
}

function createDefaultRepository(): IDrillRepository {
  if (config.storageDriver === 'file') {
    return new FileDrillRepository(path.join(config.dataDir, 'drills.json'));
  }
  return new InMemoryDrillRepository();
}

// Default singleton repository instance (file-backed unless STORAGE_DRIVER=memory)
export const defaultDrillRepository: IDrillRepository = createDefaultRepository();
