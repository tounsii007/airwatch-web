import type { AircraftState } from '@/lib/types';

export type RareTier = 1 | 2 | 3;

export interface RareInfo {
  tier: RareTier;
  label: string;
}

export interface SpottingEntry {
  aircraft: AircraftState;
  distance: number;
  rareInfo: RareInfo;
}

export const TIER_COLORS: Record<RareTier, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export const TIER_LABELS: Record<RareTier, string> = {
  1: 'LEGENDARY',
  2: 'RARE',
  3: 'NOTABLE',
};

export const RADIUS_OPTIONS = [200, 500, 1000] as const;

export const MILITARY_GOV_PREFIXES = [
  'RCH', 'DUKE', 'IRON', 'GLEX', 'NAF', 'SAM',
  'RRR', 'GAF', 'IAM', 'CASA', 'SPAR',
] as const;
