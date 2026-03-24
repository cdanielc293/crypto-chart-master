/**
 * Plan-based limits for the application.
 * Centralizes all tier restrictions in one place.
 */
import type { Interval } from '@/types/chart';

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

/**
 * Duration of each interval in seconds.
 */
const INTERVAL_SECONDS: Record<string, number> = {
  '1s': 1, '5s': 5, '10s': 10, '15s': 15, '30s': 30, '45s': 45,
  '1m': 60, '2m': 120, '3m': 180, '5m': 300, '10m': 600,
  '15m': 900, '30m': 1800, '45m': 2700,
  '1h': 3600, '2h': 7200, '3h': 10800, '4h': 14400,
  '1d': 86400, '1w': 604800, '1M': 2592000,
  '3M': 7776000, '6M': 15552000, '12M': 31104000,
};

/**
 * Returns the maximum historical depth in seconds for a given plan.
 * This is: historicalBars × intervalDurationInSeconds.
 * The key insight: changing intervals doesn't let users see further back in TIME.
 */
export function getMaxHistoricalDepthSeconds(plan: string | undefined | null, interval: Interval): number {
  const limits = getPlanLimits(plan);
  const intervalSec = INTERVAL_SECONDS[interval] || 86400;
  return limits.historicalBars * intervalSec;
}

/**
 * Returns the earliest allowed timestamp (in seconds) for the current plan + interval.
 */
export function getEarliestAllowedTimestamp(plan: string | undefined | null, interval: Interval): number {
  const depthSec = getMaxHistoricalDepthSeconds(plan, interval);
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec - depthSec;
}

/**
 * Clamps a replay start timestamp so it doesn't exceed plan limits.
 * Returns the clamped timestamp.
 */
export function clampReplayTimestamp(
  startTimeSec: number,
  plan: string | undefined | null,
  interval: Interval,
): number {
  const earliest = getEarliestAllowedTimestamp(plan, interval);
  return Math.max(startTimeSec, earliest);
}
