/**
 * Plan-based limits for the application.
 * Centralizes all tier restrictions in one place.
 */

export interface PlanLimits {
  historicalBars: number;
  chartsPerTab: number;
  indicatorsPerChart: number;
  /** Which replay intervals are allowed: 'daily' | 'daily_higher' | 'all' */
  replayAccess: 'daily' | 'daily_higher' | 'all';
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  start: {
    historicalBars: 6_000,
    chartsPerTab: 1,
    indicatorsPerChart: 4,
    replayAccess: 'daily',
  },
  core: {
    historicalBars: 10_000,
    chartsPerTab: 2,
    indicatorsPerChart: 5,
    replayAccess: 'daily_higher',
  },
  prime: {
    historicalBars: 10_000,
    chartsPerTab: 4,
    indicatorsPerChart: 10,
    replayAccess: 'all',
  },
  elite: {
    historicalBars: 20_000,
    chartsPerTab: 8,
    indicatorsPerChart: 25,
    replayAccess: 'all',
  },
  zenith: {
    historicalBars: 40_000,
    chartsPerTab: 16,
    indicatorsPerChart: 50,
    replayAccess: 'all',
  },
};

const DEFAULT_LIMITS = PLAN_LIMITS.start;

export function getPlanLimits(plan: string | undefined | null): PlanLimits {
  if (!plan) return DEFAULT_LIMITS;
  return PLAN_LIMITS[plan.toLowerCase()] || DEFAULT_LIMITS;
}

export function getHistoricalBarsLimit(plan: string | undefined | null): number {
  return getPlanLimits(plan).historicalBars;
}
