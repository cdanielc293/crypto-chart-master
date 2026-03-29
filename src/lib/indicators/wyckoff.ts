// ═══════════════════════════════════════════════════
// Wyckoff Accumulation Indicator — V2
// Range-first detection: find consolidation zones first,
// then look for Wyckoff events within each zone.
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
  price: number;
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

export interface WyckoffResult {
  events: WyckoffEvent[];
  zones: WyckoffZone[];
  poes: WyckoffPOE[];
  invalidations: WyckoffInvalidation[];
  currentPhase: WyckoffPhase;
  phaseRanges: { phase: WyckoffPhase; startIdx: number; endIdx: number; description: string }[];
}

// ─── VSA Helpers ───

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
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * pct / 100);
  return sorted[Math.min(idx, sorted.length - 1)];
}

interface VSA {
  volAvg: number[];
  spreadAvg: number[];
  closePos: number[];       // 0-1 position of close in candle
  volPercentile90: number;  // 90th percentile of volume
  volPercentile95: number;  // 95th percentile of volume
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

// ─── Consolidation Range Detection ───

interface ConsolidationRange {
  startIdx: number;
  endIdx: number;
  low: number;       // range support
  high: number;      // range resistance
  precedingTrend: 'down' | 'up' | 'none';
}

function findConsolidationRanges(data: WyckoffCandle[], minBars = 30): ConsolidationRange[] {
  if (data.length < minBars * 2) return [];

  const ranges: ConsolidationRange[] = [];
  const atr14: number[] = [];

  // Compute ATR(14) for adaptive range detection
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { atr14.push(data[i].high - data[i].low); continue; }
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    atr14.push(i < 14 ? (atr14[i - 1] * i + tr) / (i + 1) : (atr14[i - 1] * 13 + tr) / 14);
  }

  // Sliding window approach: look for periods where price stays within a bounded range
  const windowStep = 10;
  let scanStart = 20;

  while (scanStart < data.length - minBars) {
    // Find the range of the next chunk
    let rangeStart = scanStart;
    let rangeHigh = -Infinity;
    let rangeLow = Infinity;

    // Initialize with first minBars/2 candles
    const initEnd = Math.min(rangeStart + 15, data.length);
    for (let i = rangeStart; i < initEnd; i++) {
      if (data[i].high > rangeHigh) rangeHigh = data[i].high;
      if (data[i].low < rangeLow) rangeLow = data[i].low;
    }

    const initRange = rangeHigh - rangeLow;
    if (initRange <= 0) { scanStart += windowStep; continue; }

    // Expand the range as long as price stays within ~2x the initial range
    const maxAllowedRange = initRange * 2.5;
    let rangeEnd = initEnd;

    for (let i = initEnd; i < data.length; i++) {
      const newHigh = Math.max(rangeHigh, data[i].high);
      const newLow = Math.min(rangeLow, data[i].low);
      const expandedRange = newHigh - newLow;

      if (expandedRange > maxAllowedRange) break;

      rangeHigh = newHigh;
      rangeLow = newLow;
      rangeEnd = i;
    }

    const barCount = rangeEnd - rangeStart;
    if (barCount < minBars) { scanStart += windowStep; continue; }

    // Check range width vs ATR — consolidation should have range < 6x ATR
    const midATR = atr14[Math.floor((rangeStart + rangeEnd) / 2)];
    if (midATR > 0 && (rangeHigh - rangeLow) > midATR * 8) {
      scanStart += windowStep;
      continue;
    }

    // Determine preceding trend
    let precedingTrend: 'down' | 'up' | 'none' = 'none';
    if (rangeStart >= 15) {
      const prevClose = data[rangeStart - 15].close;
      const atStart = data[rangeStart].close;
      const change = (atStart - prevClose) / prevClose;
      if (change < -0.03) precedingTrend = 'down';
      else if (change > 0.03) precedingTrend = 'up';
    }

    // Only keep ranges preceded by a downtrend (accumulation)
    if (precedingTrend === 'down') {
      // Check if this overlaps with an existing range
      const overlaps = ranges.some(r =>
        (rangeStart >= r.startIdx - 10 && rangeStart <= r.endIdx + 10) ||
        (rangeEnd >= r.startIdx - 10 && rangeEnd <= r.endIdx + 10)
      );

      if (!overlaps) {
        ranges.push({
          startIdx: rangeStart,
          endIdx: rangeEnd,
          low: rangeLow,
          high: rangeHigh,
          precedingTrend,
        });
      }
    }

    scanStart = rangeEnd + 5;
  }

  return ranges;
}

// ─── Main Analysis: Find Wyckoff events within each consolidation range ───

export function analyzeWyckoff(data: WyckoffCandle[], params: {
  volPeriod?: number;
  minConsolidationBars?: number;
} = {}): WyckoffResult {
  const {
    volPeriod = 20,
    minConsolidationBars = 25,
  } = params;

  if (data.length < 80) {
    return { events: [], zones: [], poes: [], invalidations: [], currentPhase: 'none', phaseRanges: [] };
  }

  const vsa = computeVSA(data, volPeriod);
  const consolidations = findConsolidationRanges(data, minConsolidationBars);

  const events: WyckoffEvent[] = [];
  const zones: WyckoffZone[] = [];
  const poes: WyckoffPOE[] = [];
  const invalidations: WyckoffInvalidation[] = [];
  const phaseRanges: WyckoffResult['phaseRanges'] = [];

  for (const range of consolidations) {
    const { startIdx, endIdx, low: rangeLow, high: rangeHigh } = range;
    const rangeSize = rangeHigh - rangeLow;
    const supportZone = rangeLow + rangeSize * 0.15;    // bottom 15% = support area
    const resistanceZone = rangeHigh - rangeSize * 0.15; // top 15% = resistance area
    const lastDataIdx = Math.min(data.length - 1, endIdx + 50); // look a bit beyond range end

    // Draw support & resistance zones
    zones.push({
      type: 'support', price: rangeLow,
      startTime: data[startIdx].time,
      endTime: data[Math.min(data.length - 1, lastDataIdx)].time,
      label: 'Support'
    });
    zones.push({
      type: 'resistance', price: rangeHigh,
      startTime: data[startIdx].time,
      endTime: data[Math.min(data.length - 1, lastDataIdx)].time,
      label: 'Resistance'
    });

    // ═══ Phase A: Stopping the downtrend ═══

    // SC: Find the lowest point near range start with high volume
    let scIdx = startIdx;
    let scLow = data[startIdx].low;
    for (let i = startIdx; i <= Math.min(startIdx + 15, endIdx); i++) {
      if (data[i].low < scLow) {
        scLow = data[i].low;
        scIdx = i;
      }
    }
    // Validate SC has above-average volume
    if (data[scIdx].volume > vsa.volAvg[scIdx] * 1.2) {
      events.push({
        type: 'SC', index: scIdx, time: data[scIdx].time,
        price: scLow, phase: 'A',
        label: 'SC',
        description: 'Selling Climax — שיא מכירות. מוסדיים התחילו לספוג.'
      });
    }

    // AR: First significant high after SC
    let arIdx = -1;
    let arHigh = 0;
    for (let i = scIdx + 1; i <= Math.min(scIdx + 20, endIdx); i++) {
      if (data[i].high > arHigh) {
        arHigh = data[i].high;
        arIdx = i;
      }
    }
    if (arIdx !== -1 && arHigh > scLow + rangeSize * 0.3) {
      events.push({
        type: 'AR', index: arIdx, time: data[arIdx].time,
        price: arHigh, phase: 'A',
        label: 'AR',
        description: 'Automatic Rally — עלייה אוטומטית לאחר הבלימה.'
      });
    }

    // ST: Return to SC zone with lower volume
    let stIdx = -1;
    if (arIdx !== -1) {
      for (let i = arIdx + 1; i <= Math.min(arIdx + 25, endIdx); i++) {
        const nearSC = Math.abs(data[i].low - scLow) / rangeSize < 0.2;
        if (nearSC && data[i].volume < data[scIdx].volume * 0.75) {
          stIdx = i;
          events.push({
            type: 'ST', index: i, time: data[i].time,
            price: data[i].low, phase: 'A',
            label: 'ST',
            description: 'Secondary Test — מבחן משני. אישור בלימה במחזור נמוך.'
          });
          break;
        }
      }
    }

    const phaseAEnd = stIdx !== -1 ? stIdx : (arIdx !== -1 ? arIdx + 3 : scIdx + 10);
    phaseRanges.push({
      phase: 'A', startIdx, endIdx: Math.min(phaseAEnd, endIdx),
      description: 'שלב A: בלימת המגמה. SC + AR + ST.'
    });

    // ═══ Phase B: Building Cause ═══
    const phaseBStart = phaseAEnd + 1;
    const phaseBEnd = Math.min(endIdx - 10, phaseBStart + Math.floor((endIdx - phaseBStart) * 0.6));

    if (phaseBEnd > phaseBStart + 5) {
      // Look for UA (Upthrust Action) — touches above resistance but closes below
      let uaCount = 0;
      for (let i = phaseBStart; i <= phaseBEnd; i++) {
        if (data[i].high > resistanceZone && data[i].close < rangeHigh && uaCount < 2) {
          // Must have meaningful volume
          if (data[i].volume > vsa.volAvg[i]) {
            events.push({
              type: 'UA', index: i, time: data[i].time,
              price: data[i].high, phase: 'B',
              label: 'UA',
              description: 'Upthrust Action — פריצת שווא מעל הנגד. מלכודת קונים.'
            });
            uaCount++;
          }
        }
      }

      phaseRanges.push({
        phase: 'B', startIdx: phaseBStart, endIdx: phaseBEnd,
        description: 'שלב B: בניית סיבה. מוסדיים צוברים עמדות בטווח.'
      });
    }

    // ═══ Phase C: Spring / Shakeout ═══
    let springIdx = -1;
    const springSearchStart = Math.max(phaseBEnd - 5, phaseBStart);
    const springSearchEnd = Math.min(endIdx + 10, data.length - 2);

    for (let i = springSearchStart; i <= springSearchEnd; i++) {
      // Spring: dips below support and recovers above it
      if (data[i].low < rangeLow) {
        // Check recovery: close above support, OR next candle closes above
        const recoveredSameBar = data[i].close > rangeLow;
        const recoveredNextBar = i + 1 < data.length && data[i + 1].close > rangeLow;

        if (recoveredSameBar || recoveredNextBar) {
          springIdx = i;
          events.push({
            type: 'Spring', index: i, time: data[i].time,
            price: data[i].low, phase: 'C',
            label: 'Spring',
            description: 'Spring — ניעור למטה. פריצת שווא לבדיקת מוכרים. סיכון נמוך לכניסה!'
          });

          // Check for Test after Spring
          const springVolHigh = data[i].volume > vsa.volAvg[i] * 1.5;
          if (springVolHigh) {
            for (let j = i + 1; j < Math.min(data.length, i + 8); j++) {
              if (data[j].low <= rangeLow * 1.005 && data[j].volume < vsa.volAvg[j]) {
                events.push({
                  type: 'Test', index: j, time: data[j].time,
                  price: data[j].low, phase: 'C',
                  label: 'Test',
                  description: 'Test — מבחן ה-Spring. מחזור נמוך = אין מוכרים.'
                });
                break;
              }
            }
          }
          break;
        }
      }
    }

    if (springIdx !== -1) {
      phaseRanges.push({
        phase: 'C', startIdx: springIdx, endIdx: Math.min(springIdx + 3, data.length - 1),
        description: 'שלב C: ניעור (Spring). בדיקת פריצת שווא. הנקודה הקריטית!'
      });

      // POE #1: Aggressive entry
      const entryIdx = Math.min(springIdx + 2, data.length - 1);
      poes.push({
        type: 'aggressive', index: entryIdx, time: data[entryIdx].time,
        entryPrice: data[entryIdx].close,
        stopLoss: data[springIdx].low * 0.995,
        label: 'POE #1',
        description: 'כניסה אגרסיבית: Spring הושלם. SL מתחת לנמוך.'
      });
    }

    // ═══ Phase D: Markup / SOS + BU ═══
    const phaseDStart = springIdx !== -1 ? springIdx + 2 : phaseBEnd + 1;
    let sosIdx = -1;
    let buIdx = -1;

    for (let i = phaseDStart; i <= lastDataIdx; i++) {
      if (i >= data.length) break;

      // SOS: strong bullish close above resistance with volume
      if (sosIdx === -1 &&
          data[i].close > resistanceZone &&
          data[i].close > data[i].open &&
          data[i].volume > vsa.volAvg[i]) {
        sosIdx = i;
        events.push({
          type: 'SOS', index: i, time: data[i].time,
          price: data[i].high, phase: 'D',
          label: 'SOS',
          description: 'Sign of Strength — פריצה אמיתית מעל הנגד עם מחזור.'
        });
      }

      // BU: after SOS, pullback to old resistance (now support) with low volume
      if (sosIdx !== -1 && buIdx === -1 && i > sosIdx + 1) {
        const nearResistance = Math.abs(data[i].low - rangeHigh) / rangeSize < 0.2;
        if (nearResistance && data[i].volume < vsa.volAvg[i] * 0.8) {
          buIdx = i;
          events.push({
            type: 'BU', index: i, time: data[i].time,
            price: data[i].low, phase: 'D',
            label: 'BU',
            description: 'Back Up — חזרה לבדיקה. הנגד הפך לתמיכה.'
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
            description: 'כניסה שמרנית: BU הושלם. סבירות גבוהה למגמה עולה.'
          });
        }
      }
    }

    if (sosIdx !== -1) {
      phaseRanges.push({
        phase: 'D', startIdx: phaseDStart, endIdx: buIdx !== -1 ? buIdx : Math.min(sosIdx + 5, data.length - 1),
        description: 'שלב D: יציאה מהטווח. SOS + BU מאשרים מגמה חדשה.'
      });
    }

    // ═══ Invalidation ═══
    if (springIdx !== -1) {
      for (let j = springIdx + 3; j < Math.min(data.length, springIdx + 30); j++) {
        if (data[j].close < rangeLow &&
            data[j].volume > vsa.volPercentile90 &&
            (data[j].high - data[j].low) > vsa.spreadAvg[j] * 1.2) {
          invalidations.push({
            index: j, time: data[j].time, price: data[j].close,
            description: 'אזהרה: היצע כבד לאחר Spring. תבנית בוטלה.'
          });
          break;
        }
      }
    }
  }

  // Current phase
  let currentPhase: WyckoffPhase = 'none';
  if (phaseRanges.length > 0) {
    const last = phaseRanges[phaseRanges.length - 1];
    if (last.endIdx >= data.length - 30) {
      currentPhase = last.phase;
    }
  }

  return { events, zones, poes, invalidations, currentPhase, phaseRanges };
}
