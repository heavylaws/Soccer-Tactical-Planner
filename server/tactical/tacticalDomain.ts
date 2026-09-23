// Canonical Tactical Domain Model for CoachTactics

export type TeamRole = 'ATTACK' | 'DEFENSE' | 'NEUTRAL' | 'GOALKEEPER';

export const VALID_TEAM_ROLES: readonly TeamRole[] = ['ATTACK', 'DEFENSE', 'NEUTRAL', 'GOALKEEPER'] as const;

export type BallTrajectory = 'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT';

export const VALID_BALL_TRAJECTORIES: readonly BallTrajectory[] = [
  'GROUND_PASS',
  'AERIAL_PASS',
  'DRIBBLE',
  'SHOT',
] as const;

export type EquipmentType = 'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER';

export const VALID_EQUIPMENT_TYPES: readonly EquipmentType[] = [
  'CONE',
  'MINI_GOAL',
  'MANNEQUIN',
  'AGILITY_LADDER',
] as const;

export type PitchViewMode = 'FULL' | 'HALF';

export const VALID_PITCH_VIEWS: readonly PitchViewMode[] = ['FULL', 'HALF'] as const;

export interface TacticalPlayer {
  id: string;
  number: number;
  role: TeamRole;
  x: number; // 0..1 (pitch width ratio: 0.0 = left touchline, 1.0 = right touchline)
  y: number; // 0..1 (pitch length ratio: 0.0 = top goal, 1.0 = bottom goal)
  targetX: number;
  targetY: number;
  label: string;
  tacticalRole?: string;
  tacticalDuty?: string;
  hasBall?: boolean;
}

export interface TacticalBall {
  x: number; // 0..1
  y: number; // 0..1
  targetX: number;
  targetY: number;
  trajectory: BallTrajectory;
}

export interface TacticalEquipment {
  id: string;
  type: EquipmentType;
  x: number; // 0..1
  y: number; // 0..1
}

export interface DrillPhase {
  step: number;
  title: string;
  instruction: string;
  durationSec: number;
  players: TacticalPlayer[];
  ball: TacticalBall;
  equipment?: TacticalEquipment[];
}

export interface SoccerDrill {
  id: string;
  title: string;
  category: string;
  focusArea: string;
  durationMinutes: number;
  pitchView: PitchViewMode;
  description: string;
  coachingCues: string[];
  phases: DrillPhase[];
  createdByRole?: string;
  createdByUsername?: string;
  ownerId?: string;
  isCached?: boolean;
  cacheSource?: 'client' | 'server-memory' | 'coachtactics-offline' | 'gemini-fresh';
  quotaSaved?: boolean;
}
