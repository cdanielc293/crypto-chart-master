// ═══════════════════════════════════════════════════
// Wyckoff Accumulation Indicator — V3
// Manual zone selection + adaptive analysis
// Dynamic S/R, buyer/seller strength, educational output
// ═══════════════════════════════════════════════════

export interface WyckoffCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type WyckoffEventType =
  | 'PS'    // Preliminary Support
  | 'SC'    // Selling Climax
  | 'AR'    // Automatic Rally
  | 'ST'    // Secondary Test
  | 'UA'    // Upthrust Action
  | 'Spring'
  | 'Test'  // Test of Spring
  | 'SOS'   // Sign of Strength
  | 'BU'    // Back Up (Last Point of Support)
  | 'LPS';  // Last Point of Support

export type WyckoffPhase = 'A' | 'B' | 'C' | 'D' | 'none';

export interface WyckoffEvent {
  type: WyckoffEventType;
  index: number;
  time: number;
  price: number;
  phase: WyckoffPhase;
  label: string;
  description: string;
}

export interface WyckoffZone {
  type: 'support' | 'resistance';
  price: number;       // price at startTime
  priceEnd?: number;   // price at endTime (for sloped lines)
  startTime: number;
  endTime: number;
  label: string;
}

export type POEType = 'aggressive' | 'conservative';

export interface WyckoffPOE {
  type: POEType;
  index: number;
  time: number;
  entryPrice: number;
  stopLoss: number;
  label: string;
  description: string;
}

export interface WyckoffInvalidation {
  index: number;
  time: number;
  price: number;
  description: string;
}

export interface PhaseStrength {
  buyers: number;   // 0-100
  sellers: number;  // 0-100
  dominant: 'buyers' | 'sellers' | 'neutral';
  detail: string;
}

export interface PhaseRange {
  phase: WyckoffPhase;
  startIdx: number;
  endIdx: number;
  description: string;
  strength?: PhaseStrength;
}

export interface WyckoffResult {
  events: WyckoffEvent[];
  zones: WyckoffZone[];
  poes: WyckoffPOE[];
  invalidations: WyckoffInvalidation[];
  currentPhase: WyckoffPhase;
  phaseRanges: PhaseRange[];
}

// ─── Helpers ───

function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    result.push(i >= period - 1 ? sum / period : sum / (i + 1));
  }
  return result;
}

function percentile(arr: number[], pct: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * pct / 100);
  return sorted[Math.min(idx, sorted.length - 1)];
}

interface VSA {
  volAvg: number[];
  spreadAvg: number[];
  closePos: number[];       // 0-1 position of close within candle
  volPercentile90: number;
  volPercentile95: number;
}

function computeVSA(data: WyckoffCandle[], period = 20): VSA {
  const vols = data.map(c => c.volume);
  const spreads = data.map(c => c.high - c.low);
  return {
    volAvg: sma(vols, period),
    spreadAvg: sma(spreads, period),
    closePos: data.map(c => {
      const s = c.high - c.low;
      return s > 0 ? (c.close - c.low) / s : 0.5;
    }),
    volPercentile90: percentile(vols, 90),
    volPercentile95: percentile(vols, 95),
  };
}

// ─── Swing Point Detection ───

interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
}

function findSwingPoints(data: WyckoffCandle[], startIdx: number, endIdx: number, lookback = 3): SwingPoint[] {
  const points: SwingPoint[] = [];
  for (let i = startIdx + lookback; i <= endIdx - lookback; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) isHigh = false;
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) isLow = false;
    }
    if (isHigh) points.push({ index: i, price: data[i].high, type: 'high' });
    if (isLow) points.push({ index: i, price: data[i].low, type: 'low' });
  }
  return points;
}

// ─── Linear Regression for S/R slope ───

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const p of points) {
    sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function getSRAtIndex(reg: { slope: number; intercept: number }, baseIdx: number, idx: number): number {
  return reg.intercept + reg.slope * (idx - baseIdx);
}

// ─── Buyer/Seller Strength Analysis ───

function analyzeStrength(data: WyckoffCandle[], startIdx: number, endIdx: number, vsa: VSA): PhaseStrength {
  let buyVol = 0, sellVol = 0, buyBars = 0, sellBars = 0;
  let upSpread = 0, downSpread = 0;

  for (let i = startIdx; i <= Math.min(endIdx, data.length - 1); i++) {
    const c = data[i];
    const spread = c.high - c.low;
    const isUp = c.close >= c.open;
    if (isUp) {
      buyVol += c.volume;
      buyBars++;
      upSpread += spread;
    } else {
      sellVol += c.volume;
      sellBars++;
      downSpread += spread;
    }
  }

  const totalVol = buyVol + sellVol || 1;
  const buyPct = Math.round((buyVol / totalVol) * 100);
  const sellPct = 100 - buyPct;

  // Effort vs Result: large volume on small moves = absorption
  const avgUpSpread = buyBars > 0 ? upSpread / buyBars : 0;
  const avgDownSpread = sellBars > 0 ? downSpread / sellBars : 0;
  const avgUpVol = buyBars > 0 ? buyVol / buyBars : 0;
  const avgDownVol = sellBars > 0 ? sellVol / sellBars : 0;

  let dominant: 'buyers' | 'sellers' | 'neutral' = 'neutral';
  let detail = '';

  if (buyPct > 60) {
    dominant = 'buyers';
    detail = `קונים שולטים (${buyPct}% vol). `;
  } else if (sellPct > 60) {
    dominant = 'sellers';
    detail = `מוכרים שולטים (${sellPct}% vol). `;
  } else {
    detail = `מאבק שווה (${buyPct}/${sellPct}). `;
  }

  // Absorption detection
  if (avgDownVol > avgUpVol * 1.3 && avgDownSpread < avgUpSpread * 0.8) {
    detail += 'ספיגת היצע — מוסדיים קונים בלי להזיז מחיר.';
  } else if (avgUpVol > avgDownVol * 1.3 && avgUpSpread > avgDownSpread * 1.2) {
    detail += 'ביקוש אגרסיבי — קונים מובילים.';
  } else if (avgDownVol > avgUpVol && avgDownSpread > avgUpSpread) {
    detail += 'לחץ מכירות — עדיין יש היצע.';
  }

  return { buyers: buyPct, sellers: sellPct, dominant, detail };
}

// ─── Consolidation Range Detection ───

interface ConsolidationRange {
  startIdx: number;
  endIdx: number;
  low: number;
  high: number;
  precedingTrend: 'down' | 'up' | 'none';
}

function findConsolidationRanges(data: WyckoffCandle[], minBars = 30): ConsolidationRange[] {
  if (data.length < minBars * 2) return [];
  const ranges: ConsolidationRange[] = [];
  const atr14: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) { atr14.push(data[i].high - data[i].low); continue; }
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    atr14.push(i < 14 ? (atr14[i - 1] * i + tr) / (i + 1) : (atr14[i - 1] * 13 + tr) / 14);
  }

  const windowStep = 10;
  let scanStart = 20;

  while (scanStart < data.length - minBars) {
    let rangeStart = scanStart;
    let rangeHigh = -Infinity, rangeLow = Infinity;
    const initEnd = Math.min(rangeStart + 15, data.length);
    for (let i = rangeStart; i < initEnd; i++) {
      if (data[i].high > rangeHigh) rangeHigh = data[i].high;
      if (data[i].low < rangeLow) rangeLow = data[i].low;
    }
    const initRange = rangeHigh - rangeLow;
    if (initRange <= 0) { scanStart += windowStep; continue; }

    const maxAllowedRange = initRange * 2.5;
    let rangeEnd = initEnd;
    for (let i = initEnd; i < data.length; i++) {
      const newHigh = Math.max(rangeHigh, data[i].high);
      const newLow = Math.min(rangeLow, data[i].low);
      if (newHigh - newLow > maxAllowedRange) break;
      rangeHigh = newHigh; rangeLow = newLow; rangeEnd = i;
    }

    const barCount = rangeEnd - rangeStart;
    if (barCount < minBars) { scanStart += windowStep; continue; }

    const midATR = atr14[Math.floor((rangeStart + rangeEnd) / 2)];
    if (midATR > 0 && (rangeHigh - rangeLow) > midATR * 8) { scanStart += windowStep; continue; }

    let precedingTrend: 'down' | 'up' | 'none' = 'none';
    if (rangeStart >= 15) {
      const prevClose = data[rangeStart - 15].close;
      const atStart = data[rangeStart].close;
      const change = (atStart - prevClose) / prevClose;
      if (change < -0.03) precedingTrend = 'down';
      else if (change > 0.03) precedingTrend = 'up';
    }

    if (precedingTrend === 'down') {
      const overlaps = ranges.some(r =>
        (rangeStart >= r.startIdx - 10 && rangeStart <= r.endIdx + 10) ||
        (rangeEnd >= r.startIdx - 10 && rangeEnd <= r.endIdx + 10)
      );
      if (!overlaps) {
        ranges.push({ startIdx: rangeStart, endIdx: rangeEnd, low: rangeLow, high: rangeHigh, precedingTrend });
      }
    }
    scanStart = rangeEnd + 5;
  }
  return ranges;
}

// ─── Main Analysis ───

export function analyzeWyckoff(data: WyckoffCandle[], params: {
  volPeriod?: number;
  minConsolidationBars?: number;
} = {}): WyckoffResult {
  const { volPeriod = 20, minConsolidationBars = 25 } = params;
  if (data.length < 80) {
    return { events: [], zones: [], poes: [], invalidations: [], currentPhase: 'none', phaseRanges: [] };
  }

  const vsa = computeVSA(data, volPeriod);
  const consolidations = findConsolidationRanges(data, minConsolidationBars);

  const events: WyckoffEvent[] = [];
  const zones: WyckoffZone[] = [];
  const poes: WyckoffPOE[] = [];
  const invalidations: WyckoffInvalidation[] = [];
  const phaseRanges: PhaseRange[] = [];

  for (const range of consolidations) {
    analyzeRange(data, vsa, range.startIdx, range.endIdx, events, zones, poes, invalidations, phaseRanges);
  }

  let currentPhase: WyckoffPhase = 'none';
  if (phaseRanges.length > 0) {
    const last = phaseRanges[phaseRanges.length - 1];
    if (last.endIdx >= data.length - 30) currentPhase = last.phase;
  }
  return { events, zones, poes, invalidations, currentPhase, phaseRanges };
}

// ─── Manual Zone Analysis ───

export function analyzeWyckoffZone(data: WyckoffCandle[], startIdx: number, endIdx: number, params: {
  volPeriod?: number;
} = {}): WyckoffResult {
  const { volPeriod = 20 } = params;
  if (data.length < 10 || endIdx - startIdx < 5) {
    return { events: [], zones: [], poes: [], invalidations: [], currentPhase: 'none', phaseRanges: [] };
  }

  const vsa = computeVSA(data, volPeriod);
  const events: WyckoffEvent[] = [];
  const zones: WyckoffZone[] = [];
  const poes: WyckoffPOE[] = [];
  const invalidations: WyckoffInvalidation[] = [];
  const phaseRanges: PhaseRange[] = [];

  analyzeRange(data, vsa, startIdx, endIdx, events, zones, poes, invalidations, phaseRanges);

  let currentPhase: WyckoffPhase = 'none';
  if (phaseRanges.length > 0) {
    currentPhase = phaseRanges[phaseRanges.length - 1].phase;
  }
  return { events, zones, poes, invalidations, currentPhase, phaseRanges };
}

// ─── Core Range Analysis (shared by auto and manual) ───

function analyzeRange(
  data: WyckoffCandle[],
  vsa: VSA,
  startIdx: number,
  endIdx: number,
  events: WyckoffEvent[],
  zones: WyckoffZone[],
  poes: WyckoffPOE[],
  invalidations: WyckoffInvalidation[],
  phaseRanges: PhaseRange[],
): void {
  const safeEnd = Math.min(endIdx, data.length - 1);
  if (safeEnd - startIdx < 5) return;

  // Find swing points for dynamic S/R
  const lookback = Math.max(2, Math.min(5, Math.floor((safeEnd - startIdx) / 15)));
  const swings = findSwingPoints(data, startIdx, safeEnd, lookback);
  const swingLows = swings.filter(s => s.type === 'low');
  const swingHighs = swings.filter(s => s.type === 'high');

  // Static range boundaries (fallback)
  let rangeLow = Infinity, rangeHigh = -Infinity;
  for (let i = startIdx; i <= safeEnd; i++) {
    if (data[i].low < rangeLow) rangeLow = data[i].low;
    if (data[i].high > rangeHigh) rangeHigh = data[i].high;
  }
  const rangeSize = rangeHigh - rangeLow;
  if (rangeSize <= 0) return;

  // Dynamic S/R via linear regression through swing lows/highs
  const supportReg = swingLows.length >= 2
    ? linearRegression(swingLows.map(s => ({ x: s.index, y: s.price })))
    : { slope: 0, intercept: rangeLow };
  const resistReg = swingHighs.length >= 2
    ? linearRegression(swingHighs.map(s => ({ x: s.index, y: s.price })))
    : { slope: 0, intercept: rangeHigh };

  const lastDataIdx = Math.min(data.length - 1, safeEnd + 50);

  // Create dynamic S/R zones
  const supportStart = getSRAtIndex(supportReg, startIdx, startIdx);
  const supportEnd = getSRAtIndex(supportReg, startIdx, lastDataIdx);
  const resistStart = getSRAtIndex(resistReg, startIdx, startIdx);
  const resistEnd = getSRAtIndex(resistReg, startIdx, lastDataIdx);

  zones.push({
    type: 'support', price: supportStart, priceEnd: supportEnd,
    startTime: data[startIdx].time,
    endTime: data[lastDataIdx].time,
    label: supportReg.slope !== 0
      ? (supportReg.slope > 0 ? 'Support ↗' : 'Support ↘')
      : 'Support'
  });
  zones.push({
    type: 'resistance', price: resistStart, priceEnd: resistEnd,
    startTime: data[startIdx].time,
    endTime: data[lastDataIdx].time,
    label: resistReg.slope !== 0
      ? (resistReg.slope > 0 ? 'Resistance ↗' : 'Resistance ↘')
      : 'Resistance'
  });

  // Helper: get dynamic support/resistance at a given index
  const supportAt = (i: number) => getSRAtIndex(supportReg, startIdx, i);
  const resistAt = (i: number) => getSRAtIndex(resistReg, startIdx, i);
  const nearSupport = (i: number, tolerance = 0.03) => {
    const sup = supportAt(i);
    return Math.abs(data[i].low - sup) / rangeSize < tolerance;
  };
  const nearResist = (i: number, tolerance = 0.03) => {
    const res = resistAt(i);
    return Math.abs(data[i].high - res) / rangeSize < tolerance;
  };

  // ═══ Phase A: Stopping the downtrend ═══
  // Find SC: deepest low with high volume in first 25% of range
  const phaseASearchEnd = Math.min(startIdx + Math.ceil((safeEnd - startIdx) * 0.3), safeEnd);

  // PS: preliminary support — first significant low before SC
  let psIdx = -1;
  for (let i = startIdx; i < Math.min(startIdx + 8, phaseASearchEnd); i++) {
    if (data[i].close < data[i].open && data[i].volume > vsa.volAvg[i] * 0.8) {
      const nextUp = i + 1 < data.length && data[i + 1].close > data[i + 1].open;
      if (nextUp) { psIdx = i; break; }
    }
  }
  if (psIdx !== -1) {
    events.push({
      type: 'PS', index: psIdx, time: data[psIdx].time,
      price: data[psIdx].low, phase: 'A', label: 'PS',
      description: 'Preliminary Support — תמיכה מקדימה. סימן ראשון לעצירת ירידות.'
    });
  }

  // SC: selling climax
  let scIdx = startIdx;
  let scLow = data[startIdx].low;
  let scVol = data[startIdx].volume;
  for (let i = startIdx; i <= phaseASearchEnd; i++) {
    // Prefer lowest point with highest volume
    const score = (rangeHigh - data[i].low) / rangeSize + (data[i].volume / (vsa.volPercentile90 || 1));
    const bestScore = (rangeHigh - scLow) / rangeSize + (scVol / (vsa.volPercentile90 || 1));
    if (score > bestScore) {
      scLow = data[i].low;
      scIdx = i;
      scVol = data[i].volume;
    }
  }

  const scHasVolume = data[scIdx].volume > vsa.volAvg[scIdx] * 1.0;
  if (scHasVolume) {
    events.push({
      type: 'SC', index: scIdx, time: data[scIdx].time,
      price: scLow, phase: 'A', label: 'SC',
      description: 'Selling Climax — שיא מכירות. נפח גבוה + נר ירידה חד. מוסדיים ספגו.'
    });
  }

  // AR: automatic rally — first significant high after SC
  let arIdx = -1;
  let arHigh = 0;
  const arSearchEnd = Math.min(scIdx + Math.ceil((safeEnd - scIdx) * 0.35), safeEnd);
  for (let i = scIdx + 1; i <= arSearchEnd; i++) {
    if (data[i].high > arHigh) {
      arHigh = data[i].high;
      arIdx = i;
    }
  }
  // AR must be a meaningful bounce (at least 30% of range)
  if (arIdx !== -1 && arHigh > scLow + rangeSize * 0.25) {
    events.push({
      type: 'AR', index: arIdx, time: data[arIdx].time,
      price: arHigh, phase: 'A', label: 'AR',
      description: 'Automatic Rally — עלייה אוטומטית. שורטיסטים סוגרים + קונים ראשונים.'
    });
  }

  // ST: secondary test — return to SC area with lower volume
  let stIdx = -1;
  if (arIdx !== -1) {
    const stSearchEnd = Math.min(arIdx + Math.ceil((safeEnd - arIdx) * 0.3), safeEnd);
    let bestSTScore = 0;
    for (let i = arIdx + 2; i <= stSearchEnd; i++) {
      const distFromSC = Math.abs(data[i].low - scLow) / rangeSize;
      if (distFromSC < 0.25 && data[i].volume < data[scIdx].volume * 0.85) {
        // Score: closer to SC and lower volume = better ST
        const score = (1 - distFromSC) * (1 - data[i].volume / data[scIdx].volume);
        if (score > bestSTScore) {
          bestSTScore = score;
          stIdx = i;
        }
      }
    }
    if (stIdx !== -1) {
      const volRatio = Math.round((data[stIdx].volume / data[scIdx].volume) * 100);
      events.push({
        type: 'ST', index: stIdx, time: data[stIdx].time,
        price: data[stIdx].low, phase: 'A', label: 'ST',
        description: `Secondary Test — מבחן משני. נפח ${volRatio}% מה-SC. ${volRatio < 50 ? 'ירידה משמעותית בהיצע!' : 'עדיין יש היצע.'}`
      });
    }
  }

  const phaseAEnd = stIdx !== -1 ? stIdx : (arIdx !== -1 ? arIdx + 3 : scIdx + 10);
  const phaseAStrength = analyzeStrength(data, startIdx, Math.min(phaseAEnd, safeEnd), vsa);
  phaseRanges.push({
    phase: 'A', startIdx, endIdx: Math.min(phaseAEnd, safeEnd),
    description: 'שלב A: בלימת ירידות. SC + AR + ST.',
    strength: phaseAStrength,
  });

  // ═══ Phase B: Building Cause ═══
  const phaseBStart = Math.min(phaseAEnd + 1, safeEnd);
  // Phase B typically takes 40-60% of the total range
  const phaseBEnd = Math.min(safeEnd - Math.ceil((safeEnd - startIdx) * 0.15),
    phaseBStart + Math.floor((safeEnd - phaseBStart) * 0.65));

  if (phaseBEnd > phaseBStart + 5) {
    // Look for UA (Upthrust Action) — pierces above dynamic resistance but closes below
    let uaCount = 0;
    for (let i = phaseBStart; i <= phaseBEnd && uaCount < 3; i++) {
      const res = resistAt(i);
      if (data[i].high > res && data[i].close < res) {
        if (data[i].volume > vsa.volAvg[i] * 0.8) {
          events.push({
            type: 'UA', index: i, time: data[i].time,
            price: data[i].high, phase: 'B', label: 'UA',
            description: 'Upthrust Action — פריצת שווא מעל ההתנגדות. מלכודת קונים. מוסדיים מוכרים.'
          });
          uaCount++;
        }
      }
    }

    // Look for ST in Phase B — tests of support
    let stBCount = 0;
    for (let i = phaseBStart; i <= phaseBEnd && stBCount < 2; i++) {
      if (nearSupport(i, 0.04) && data[i].volume < vsa.volAvg[i] * 0.9) {
        // Check it's a bounce — next bar closes higher
        if (i + 1 <= safeEnd && data[i + 1].close > data[i].close) {
          events.push({
            type: 'ST', index: i, time: data[i].time,
            price: data[i].low, phase: 'B', label: 'ST-B',
            description: 'Secondary Test (Phase B) — מבחן תמיכה נוסף. מחזור נמוך = ספיגה.'
          });
          stBCount++;
        }
      }
    }

    const phaseBStrength = analyzeStrength(data, phaseBStart, phaseBEnd, vsa);
    phaseRanges.push({
      phase: 'B', startIdx: phaseBStart, endIdx: phaseBEnd,
      description: 'שלב B: בניית סיבה. מוסדיים צוברים — לוקח זמן.',
      strength: phaseBStrength,
    });
  }

  // ═══ Phase C: Spring / Shakeout ═══
  let springIdx = -1;
  // Spring typically occurs in the last 30-40% of the consolidation
  const springSearchStart = Math.max(phaseBEnd - 5, Math.floor(startIdx + (safeEnd - startIdx) * 0.5));
  const springSearchEnd = Math.min(safeEnd + 10, data.length - 2);

  // Look for Spring: price dips below dynamic support and recovers
  let bestSpringScore = 0;
  for (let i = springSearchStart; i <= springSearchEnd; i++) {
    const sup = supportAt(i);
    if (data[i].low < sup) {
      // How far below support did it go?
      const penetration = (sup - data[i].low) / rangeSize;
      // Did it recover?
      const recoveredSameBar = data[i].close > sup;
      const recoveredNextBar = i + 1 < data.length && data[i + 1].close > sup;

      if ((recoveredSameBar || recoveredNextBar) && penetration < 0.15) {
        // Better spring = small penetration + quick recovery + volume spike
        const volSpike = data[i].volume / (vsa.volAvg[i] || 1);
        const score = penetration * 2 + (recoveredSameBar ? 1 : 0.5) + Math.min(volSpike, 2);

        if (score > bestSpringScore) {
          bestSpringScore = score;
          springIdx = i;
        }
      }
    }
  }

  if (springIdx !== -1) {
    const sup = supportAt(springIdx);
    const penetrationPct = ((sup - data[springIdx].low) / rangeSize * 100).toFixed(1);
    const volRatio = (data[springIdx].volume / vsa.volAvg[springIdx]).toFixed(1);

    events.push({
      type: 'Spring', index: springIdx, time: data[springIdx].time,
      price: data[springIdx].low, phase: 'C', label: 'Spring',
      description: `Spring — ניעור ${penetrationPct}% מתחת לתמיכה. נפח x${volRatio}. פריצת שווא לטירוף מוכרים!`
    });

    // Test of Spring
    for (let j = springIdx + 1; j < Math.min(data.length, springIdx + 10); j++) {
      const sup2 = supportAt(j);
      if (data[j].low <= sup2 * 1.005 && data[j].low > data[springIdx].low && data[j].volume < vsa.volAvg[j]) {
        events.push({
          type: 'Test', index: j, time: data[j].time,
          price: data[j].low, phase: 'C', label: 'Test',
          description: 'Test — מבחן Spring. מחזור יורד + הנמוך לא נשבר = אין מוכרים. סימן חזק!'
        });
        break;
      }
    }

    // LPS — Last Point of Support (can appear near end of Phase C or start of D)
    for (let j = springIdx + 3; j < Math.min(data.length, springIdx + 20); j++) {
      const sup3 = supportAt(j);
      if (nearSupport(j, 0.05) && data[j].volume < vsa.volAvg[j] * 0.7 && data[j].close > sup3) {
        events.push({
          type: 'LPS', index: j, time: data[j].time,
          price: data[j].low, phase: 'C', label: 'LPS',
          description: 'Last Point of Support — נקודת תמיכה אחרונה. חולשת מוכרים ברורה.'
        });
        break;
      }
    }

    const phaseCStrength = analyzeStrength(data, springIdx, Math.min(springIdx + 5, data.length - 1), vsa);
    phaseRanges.push({
      phase: 'C', startIdx: springIdx, endIdx: Math.min(springIdx + 5, data.length - 1),
      description: 'שלב C: ניעור (Spring). הנקודה הקריטית — מלכודת למוכרים.',
      strength: phaseCStrength,
    });

    // POE #1: Aggressive entry after Spring
    const entryIdx = Math.min(springIdx + 2, data.length - 1);
    poes.push({
      type: 'aggressive', index: entryIdx, time: data[entryIdx].time,
      entryPrice: data[entryIdx].close,
      stopLoss: data[springIdx].low * 0.995,
      label: 'POE #1',
      description: 'כניסה אגרסיבית: Spring + Recovery. SL מתחת לנמוך של Spring.'
    });
  }

  // ═══ Phase D: Markup / SOS + BU ═══
  const phaseDStart = springIdx !== -1 ? springIdx + 3 : (phaseBEnd > phaseBStart ? phaseBEnd + 1 : phaseAEnd + 1);
  let sosIdx = -1, buIdx = -1;

  for (let i = phaseDStart; i <= lastDataIdx; i++) {
    if (i >= data.length) break;

    const res = resistAt(i);

    // SOS: strong close above dynamic resistance with volume
    if (sosIdx === -1 && data[i].close > res && data[i].close > data[i].open) {
      const spread = data[i].high - data[i].low;
      const avgSpread = vsa.spreadAvg[i] || spread;
      if (data[i].volume > vsa.volAvg[i] * 0.9 && spread > avgSpread * 0.8) {
        sosIdx = i;
        const breakPct = ((data[i].close - res) / rangeSize * 100).toFixed(1);
        events.push({
          type: 'SOS', index: i, time: data[i].time,
          price: data[i].high, phase: 'D', label: 'SOS',
          description: `Sign of Strength — פריצה ${breakPct}% מעל ההתנגדות. נפח מאשר. קונים שולטים!`
        });
      }
    }

    // BU: after SOS, pullback to old resistance with low volume
    if (sosIdx !== -1 && buIdx === -1 && i > sosIdx + 1) {
      const res2 = resistAt(i);
      const nearOldResist = Math.abs(data[i].low - res2) / rangeSize < 0.15;
      if (nearOldResist && data[i].volume < vsa.volAvg[i] * 0.85) {
        buIdx = i;
        events.push({
          type: 'BU', index: i, time: data[i].time,
          price: data[i].low, phase: 'D', label: 'BU/LPS',
          description: 'Back Up — חזרה להתנגדות שהפכה לתמיכה. מחזור נמוך = אין מוכרים.'
        });

        // POE #2: Conservative entry
        let localLow = data[i].low;
        for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
          if (data[k].low < localLow) localLow = data[k].low;
        }
        poes.push({
          type: 'conservative', index: i, time: data[i].time,
          entryPrice: data[i].close,
          stopLoss: localLow * 0.997,
          label: 'POE #2',
          description: 'כניסה שמרנית: BU/LPS הושלם. סבירות גבוהה למגמה עולה.'
        });
      }
    }
  }

  if (sosIdx !== -1 || phaseDStart < data.length) {
    const phaseDEnd = buIdx !== -1 ? buIdx : (sosIdx !== -1 ? Math.min(sosIdx + 8, data.length - 1) : Math.min(phaseDStart + 5, data.length - 1));
    const phaseDStrength = analyzeStrength(data, phaseDStart, Math.min(phaseDEnd, data.length - 1), vsa);
    phaseRanges.push({
      phase: 'D', startIdx: phaseDStart, endIdx: phaseDEnd,
      description: 'שלב D: יציאה מהטווח. SOS + BU מאשרים מעבר למגמה עולה.',
      strength: phaseDStrength,
    });
  }

  // ═══ Invalidation ═══
  if (springIdx !== -1) {
    for (let j = springIdx + 3; j < Math.min(data.length, springIdx + 30); j++) {
      const sup = supportAt(j);
      if (data[j].close < sup * 0.99 &&
          data[j].volume > vsa.volPercentile90 &&
          (data[j].high - data[j].low) > (vsa.spreadAvg[j] || 1) * 1.2) {
        invalidations.push({
          index: j, time: data[j].time, price: data[j].close,
          description: 'אזהרה: היצע כבד לאחר Spring. נפח גבוה + שבירת תמיכה = תבנית בוטלה!'
        });
        break;
      }
    }
  }
}
