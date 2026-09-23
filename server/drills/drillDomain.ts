// CoachTactics Canonical Stored Drill Entity & Types
import { SoccerDrill, DrillPhase, PitchViewMode } from '../tactical/tacticalDomain.ts';

export interface StoredDrill {
  id: string;
  title: string;
  category: string;
  focusArea: string;
  durationMinutes: number;
  pitchView: PitchViewMode;
  description: string;
  coachingCues: string[];
  phases: DrillPhase[];

  // Server-authoritative ownership and metadata
  createdBy: string;           // Authenticated user ID of creator (immutable)
  createdByUsername?: string;  // Username of creator (display helper)
  createdByRole?: string;      // Role of creator (display helper)
  ownerId?: string;           // Alias to createdBy for client compatibility
  createdAt: string;           // ISO 8601 creation timestamp (immutable)
  updatedBy: string;           // Authenticated user ID of last updater
  updatedAt: string;           // ISO 8601 modification timestamp
  version: number;             // Incremental version counter (starting at 1)
  isSystem: boolean;           // True for pre-seeded system/demo drills, false for user drills

  // Cache & quota flags
  isCached?: boolean;
  cacheSource?: string;
  quotaSaved?: boolean;
}

export type CreateDrillInput = Partial<Omit<SoccerDrill, 'phases'>> & {
  phases?: DrillPhase[];
  [key: string]: unknown;
};

export type UpdateDrillInput = Partial<CreateDrillInput>;
