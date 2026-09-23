// Tactical Data Models matching CoachTactics (heavylaws/CoachPlanner)

export type TeamRole = 'ATTACK' | 'DEFENSE' | 'NEUTRAL' | 'GOALKEEPER';

export type UserRole = 'SUPER_ADMIN' | 'HEAD_COACH' | 'ASSISTANT_COACH' | 'CLIENT' | 'PLAYER';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  avatarColor: string;
  password?: string;
  needsEmailSetup?: boolean;
}

export type BallTrajectory = 'GROUND_PASS' | 'AERIAL_PASS' | 'DRIBBLE' | 'SHOT';

export type EquipmentType = 'CONE' | 'MINI_GOAL' | 'MANNEQUIN' | 'AGILITY_LADDER';

// Detailed Tactical Archetypes / Instructions
export type TacticalRoleType =
  | 'Target Man'
  | 'False 9'
  | 'Poacher'
  | 'Sweeper Keeper'
  | 'Inverted Winger'
  | 'Inside Forward'
  | 'Deep-Lying Playmaker'
  | 'Box-to-Box'
  | 'Ball-Winning Midfielder'
  | 'Inverted Wing-Back'
  | 'Attacking Fullback'
  | 'Ball-Playing Defender'
  | 'No-Nonsense CB'
  | 'Regista'
  | 'Trequartista'
  | 'Pressing Forward';

export interface TacticalPlayer {
  id: string;
  number: number;
  role: TeamRole;
  x: number; // 0..1 (pitch width ratio)
  y: number; // 0..1 (pitch length ratio)
  targetX: number;
  targetY: number;
  label: string;
  tacticalRole?: TacticalRoleType | string;
  tacticalDuty?: string; // e.g. "Holds up play, draws center backs"
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
  x: number;
  y: number;
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
  pitchView: 'FULL' | 'HALF';
  description: string;
  coachingCues: string[];
  phases: DrillPhase[];
  createdBy?: string;
  createdByRole?: UserRole | string;
  createdByUsername?: string;
  ownerId?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  version?: number;
  isSystem?: boolean;
  isCached?: boolean;
  cacheSource?: 'client' | 'server-memory' | 'uefa-offline' | 'gemini-fresh' | 'coachtactics-offline';
  quotaSaved?: boolean;
}

// Annotation and Telestrator Models
export type AnnotationTool =
  | 'MOVE'
  | 'PEN'
  | 'ARROW'
  | 'PASS'
  | 'DRIBBLE'
  | 'ZONE'
  | 'LASER'
  | 'NOTE'
  | 'ERASER';

export interface AnnotationPoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
}

export interface TacticalAnnotation {
  id: string;
  tool: 'PEN' | 'ARROW' | 'PASS' | 'DRIBBLE' | 'ZONE';
  points: AnnotationPoint[];
  color: string;
  strokeWidth: number;
  isDashed?: boolean;
}

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface QuickTacticalNote {
  id: string;
  text: string;
  x: number;
  y: number;
  author: string;
  timestamp: number;
  color?: string;
}

// Tactical Layers System
export type TacticalLayerType = 'ALL' | 'OFFENSE' | 'DEFENSE' | 'NEUTRAL' | 'BALL_CORRIDORS';

export interface TacticalLayerConfig {
  id: TacticalLayerType;
  name: string;
  visible: boolean;
  color: string;
  pathColor: string;
  pathStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  showTrajectories: boolean;
}
