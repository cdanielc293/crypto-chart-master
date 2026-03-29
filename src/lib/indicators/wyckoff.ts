// ═══════════════════════════════════════════════════
// Wyckoff Accumulation Indicator — Full algorithmic detection
// Modules: VSA engine, CHoCH detection, Phase identification,
//          Noise filtering, POE signals
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
  | 'StoppingAction'
  | 'EaseOfMovement';

export type WyckoffPhase = 'A' | 'B' | 'C' | 'D' | 'none';

export interface WyckoffEvent {
  type: WyckoffEventType;
  index: number;
  time: number;
  price: number;    // display price for label
  phase: WyckoffPhase;
  label: string;    // short label on chart
  description: string; // educational text
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

// ─── Module 1: VSA Engine ───

function smaArray(values: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    result.push(i >= period - 1 ? sum / period : sum / (i + 1));
  }
  return result;
}

interface VSAResult {
  volumeAvg: number[];
  spreadAvg: number[];
  closePosition: number[];  // 0-1: position of close within candle
  isStoppingAction: boolean[];
  isEaseOfMovement: boolean[];
  isHighVolume: boolean[];
  isClimaxVolume: boolean[];
}

function analyzeVSA(data: WyckoffCandle[], volPeriod = 20): VSAResult {
  const volumes = data.map(c => c.volume);
  const spreads = data.map(c => c.high - c.low);
  const volumeAvg = smaArray(volumes, volPeriod);
  const spreadAvg = smaArray(spreads, volPeriod);

  const closePosition: number[] = data.map(c => {
    const spread = c.high - c.low;
    return spread > 0 ? (c.close - c.low) / spread : 0.5;
  });

  const isHighVolume: boolean[] = [];
  const isClimaxVolume: boolean[] = [];
  const isStoppingAction: boolean[] = [];
  const isEaseOfMovement: boolean[] = [];

  for (let i = 0; i < data.length; i++) {
    const vol = data[i].volume;
    const avg = volumeAvg[i];
    const spread = spreads[i];
    const avgSpread = spreadAvg[i];
    const cp = closePosition[i];

    isHighVolume.push(vol > avg * 1.5);
    isClimaxVolume.push(vol > avg * 2.5);

    // Stopping Action: high volume + narrow spread or close in upper half
    isStoppingAction.push(
      vol > avg * 1.5 && (spread < avgSpread * 0.8 || cp > 0.5)
    );

    // Ease of Movement: low volume + wide spread
    isEaseOfMovement.push(
      vol <= avg && spread > avgSpread * 1.3
    );
  }

  return { volumeAvg, spreadAvg, closePosition, isStoppingAction, isEaseOfMovement, isHighVolume, isClimaxVolume };
}

// ─── Module 2: CHoCH & Trading Range Detection ───

function findSwingLows(data: WyckoffCandle[], lookback: number = 5): { index: number; price: number }[] {
  const lows: { index: number; price: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].low >= data[i - j].low || data[i].low >= data[i + j].low) {
        isLow = false;
        break;
      }
    }
    if (isLow) lows.push({ index: i, price: data[i].low });
  }
  return lows;
}

function findSwingHighs(data: WyckoffCandle[], lookback: number = 5): { index: number; price: number }[] {
  const highs: { index: number; price: number }[] = [];
  for (let i = lookback; i < data.length - lookback; i++) {
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (data[i].high <= data[i - j].high || data[i].high <= data[i + j].high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) highs.push({ index: i, price: data[i].high });
  }
  return highs;
}

// ─── Module 3: Main Wyckoff Accumulation Analysis ───

export function analyzeWyckoff(data: WyckoffCandle[], params: {
  volPeriod?: number;
  swingLookback?: number;
  stThreshold?: number;   // % threshold for ST proximity to SC
  springThreshold?: number; // % below support to count as spring
  minPhaseBBars?: number;  // minimum bars for phase B
} = {}): WyckoffResult {
  const {
    volPeriod = 20,
    swingLookback = 5,
    stThreshold = 3,
    springThreshold = 1.5,
    minPhaseBBars = 15,   // increased: consolidation needs meaningful time
  } = params;

  if (data.length < volPeriod + swingLookback * 2 + 20) {
    return { events: [], zones: [], poes: [], invalidations: [], currentPhase: 'none', phaseRanges: [] };
  }

  const vsa = analyzeVSA(data, volPeriod);
  const swingLows = findSwingLows(data, swingLookback);
  const swingHighs = findSwingHighs(data, swingLookback);
  
  const events: WyckoffEvent[] = [];
  const zones: WyckoffZone[] = [];
  const poes: WyckoffPOE[] = [];
  const invalidations: WyckoffInvalidation[] = [];
  const phaseRanges: WyckoffResult['phaseRanges'] = [];

  // Track detected structures to avoid overlapping detections
  const detectedRanges: { lowPrice: number; highPrice: number; startIdx: number; endIdx: number }[] = [];

  function isInsideExistingStructure(idx: number, price: number): boolean {
    for (const r of detectedRanges) {
      // Check if this index or price overlaps with an existing structure
      if (idx >= r.startIdx - 10 && idx <= r.endIdx + 30) return true;
      // Check price overlap — if the price is within the range, it's the same consolidation
      const rangePadding = (r.highPrice - r.lowPrice) * 0.3;
      if (price >= r.lowPrice - rangePadding && price <= r.highPrice + rangePadding && idx <= r.endIdx + 60) return true;
    }
    return false;
  }

  for (let scan = volPeriod + swingLookback; scan < data.length - 20; scan++) {
    // ─── Find SC: swing low + climax volume + bearish candle ───
    const c = data[scan];
    const isSwingLow = swingLows.some(s => s.index === scan);
    if (!isSwingLow) continue;
    if (!vsa.isClimaxVolume[scan] && !vsa.isHighVolume[scan]) continue;
    if (c.close > c.open) continue; // must be bearish or neutral

    // Skip if inside an already-detected structure
    if (isInsideExistingStructure(scan, c.low)) continue;

    // Check for preceding downtrend (at least 5 lower closes in last 10)
    let lowerCloses = 0;
    for (let j = 1; j <= Math.min(10, scan); j++) {
      if (data[scan - j].close > data[scan - j + 1].close) lowerCloses++;
    }
    if (lowerCloses < 4) continue;

    const scIndex = scan;
    const scPrice = data[scIndex].low;
    const scVolume = data[scIndex].volume;

    // ─── Find AR: first strong swing high after SC ───
    let arIndex = -1;
    let arPrice = 0;
    for (const sh of swingHighs) {
      if (sh.index > scIndex && sh.index <= scIndex + 15) {
        // Must show bullish momentum
        if (data[sh.index].close > data[sh.index].open) {
          arIndex = sh.index;
          arPrice = sh.price;
          break;
        }
      }
    }
    if (arIndex === -1) {
      // Fallback: find highest high within 15 bars
      let maxH = 0;
      for (let j = 1; j <= Math.min(15, data.length - scIndex - 1); j++) {
        if (data[scIndex + j].high > maxH) {
          maxH = data[scIndex + j].high;
          arIndex = scIndex + j;
          arPrice = maxH;
        }
      }
    }
    if (arIndex === -1) continue;

    const supportLine = scPrice;
    const resistanceLine = arPrice;
    const range = resistanceLine - supportLine;
    if (range <= 0) continue;

    // ─── Phase A: SC + AR ───
    events.push({
      type: 'SC', index: scIndex, time: data[scIndex].time,
      price: scPrice, phase: 'A',
      label: 'SC', description: 'Selling Climax — שיא מכירות. מוסדיים החלו לספוג היצע.'
    });

    events.push({
      type: 'AR', index: arIndex, time: data[arIndex].time,
      price: arPrice, phase: 'A',
      label: 'AR', description: 'Automatic Rally — עלייה אוטומטית. ביקוש חזר לאחר הבלימה.'
    });

    zones.push({
      type: 'support', price: supportLine,
      startTime: data[scIndex].time,
      endTime: data[Math.min(data.length - 1, scIndex + 200)].time,
      label: 'Support (SC Low)'
    });
    zones.push({
      type: 'resistance', price: resistanceLine,
      startTime: data[arIndex].time,
      endTime: data[Math.min(data.length - 1, arIndex + 200)].time,
      label: 'Resistance (AR High)'
    });

    // ─── Find ST: return to SC zone with lower volume ───
    let stIndex = -1;
    for (let j = arIndex + 1; j < Math.min(data.length, arIndex + 30); j++) {
      const pctFromSC = Math.abs(data[j].low - scPrice) / range * 100;
      if (pctFromSC < stThreshold && data[j].volume < scVolume * 0.8) {
        stIndex = j;
        events.push({
          type: 'ST', index: j, time: data[j].time,
          price: data[j].low, phase: 'A',
          label: 'ST', description: 'Secondary Test — מבחן משני. אישור בלימה עם מחזור נמוך יותר.'
        });
        break;
      }
    }

    const phaseAEnd = stIndex !== -1 ? stIndex : arIndex + 5;
    phaseRanges.push({
      phase: 'A', startIdx: scIndex, endIdx: phaseAEnd,
      description: 'שלב A: המגמה הקודמת נבלמה. מוסדיים החלו לאסוף סחורה.'
    });

    // ─── Phase B: Building Cause ───
    const phaseBStart = phaseAEnd + 1;
    let phaseBEnd = phaseBStart;
    let springIndex = -1;
    let springTested = false;

    // Look for range-bound movement and upthrust actions
    for (let j = phaseBStart; j < Math.min(data.length - 5, phaseBStart + 120); j++) {
      // Check for Upthrust Action (UA): price breaks above resistance then falls back
      if (data[j].high > resistanceLine && data[j].close < resistanceLine) {
        events.push({
          type: 'UA', index: j, time: data[j].time,
          price: data[j].high, phase: 'B',
          label: 'UA', description: 'Upthrust Action — פריצת שווא כלפי מעלה. מלכודת קונים.'
        });
      }

      // Check for Spring (Phase C): price dips below support then recovers
      const belowPct = (supportLine - data[j].low) / range * 100;
      if (belowPct > 0 && belowPct < springThreshold * 3 && data[j].close > supportLine) {
        // Verify enough bars in phase B (noise filter)
        if (j - phaseBStart < minPhaseBBars) continue;

        phaseBEnd = j - 1;
        springIndex = j;
        break;
      }

      // Also check if close below support with next candle recovering
      if (data[j].close < supportLine && j + 1 < data.length && data[j + 1].close > supportLine) {
        if (j - phaseBStart < minPhaseBBars) continue;
        phaseBEnd = j - 1;
        springIndex = j;
        break;
      }

      phaseBEnd = j;
    }

    if (phaseBEnd > phaseBStart) {
      // Detect VSA stopping actions within Phase B
      for (let j = phaseBStart; j <= phaseBEnd; j++) {
        if (vsa.isStoppingAction[j]) {
          events.push({
            type: 'StoppingAction', index: j, time: data[j].time,
            price: data[j].low, phase: 'B',
            label: 'SA', description: 'Stopping Action — בלימה מוסדית. מחזור גבוה ללא תנועה.'
          });
        }
      }

      phaseRanges.push({
        phase: 'B', startIdx: phaseBStart, endIdx: phaseBEnd,
        description: 'שלב B: בניית סיבה. מוסדיים ממשיכים לצבור עמדות בטווח.'
      });
    }

    // ─── Phase C: Spring / Shakeout ───
    if (springIndex !== -1) {
      const springCandle = data[springIndex];
      const springVolHigh = vsa.isHighVolume[springIndex];
      
      events.push({
        type: 'Spring', index: springIndex, time: springCandle.time,
        price: springCandle.low, phase: 'C',
        label: 'Spring', description: 'Spring — פריצת שווא למטה. המוסדיים בוחנים מוכרים. נקודת הכניסה בסיכון הנמוך ביותר!'
      });

      // Module 4: Volume contraction validation
      // Average down-candle volume in Phase C should be lower than Phase A
      let phaseADownVol = 0, phaseADownCount = 0;
      for (let j = scIndex; j <= phaseAEnd; j++) {
        if (data[j].close < data[j].open) { phaseADownVol += data[j].volume; phaseADownCount++; }
      }
      const avgPhaseADownVol = phaseADownCount > 0 ? phaseADownVol / phaseADownCount : 0;

      // Check for Test after Spring (if high volume spring)
      let testIndex = -1;
      if (springVolHigh) {
        for (let j = springIndex + 1; j < Math.min(data.length, springIndex + 10); j++) {
          if (data[j].low <= supportLine * 1.005 && data[j].volume < vsa.volumeAvg[j]) {
            testIndex = j;
            springTested = true;
            events.push({
              type: 'Test', index: j, time: data[j].time,
              price: data[j].low, phase: 'C',
              label: 'Test', description: 'Test — מבחן ה-Spring. מחזור נמוך מאשר אין מוכרים.'
            });
            break;
          }
        }
      } else {
        // Low volume spring = immediate confirmation
        springTested = true;
      }

      const phaseCEnd = testIndex !== -1 ? testIndex : springIndex + 2;
      phaseRanges.push({
        phase: 'C', startIdx: springIndex, endIdx: Math.min(data.length - 1, phaseCEnd),
        description: 'שלב C: ניעור (Spring). בדיקת פריצת שווא. הנקודה הקריטית ביותר!'
      });

      // ─── POE #1: Aggressive entry after Spring ───
      if (springTested) {
        const entryIdx = testIndex !== -1 ? testIndex + 1 : springIndex + 1;
        if (entryIdx < data.length) {
          const slPrice = springCandle.low * (1 - 0.005); // 0.5% below spring low
          poes.push({
            type: 'aggressive', index: entryIdx, time: data[entryIdx].time,
            entryPrice: data[entryIdx].close,
            stopLoss: slPrice,
            label: 'POE #1',
            description: 'איתות קנייה (אגרסיבי): פריצת שווא הושלמה. SL מתחת לנמוך של ה-Spring.'
          });
        }
      }

      // ─── Phase D: Sign of Strength + Back Up ───
      const phaseDStart = (testIndex !== -1 ? testIndex : springIndex) + 1;
      let sosIndex = -1;
      let buIndex = -1;

      for (let j = phaseDStart; j < Math.min(data.length, phaseDStart + 50); j++) {
        // SOS: bullish candle with wide spread + increasing volume + close above resistance
        if (sosIndex === -1) {
          const spread = data[j].high - data[j].low;
          if (data[j].close > resistanceLine &&
              data[j].close > data[j].open &&
              spread > vsa.spreadAvg[j] &&
              data[j].volume > vsa.volumeAvg[j]) {
            sosIndex = j;
            events.push({
              type: 'SOS', index: j, time: data[j].time,
              price: data[j].high, phase: 'D',
              label: 'SOS', description: 'Sign of Strength — סימן עוצמה. פריצה אמיתית עם מחזור.'
            });
          }
        }

        // BU: after SOS, pullback to resistance (now support) with low volume
        if (sosIndex !== -1 && buIndex === -1 && j > sosIndex) {
          const nearResistance = Math.abs(data[j].low - resistanceLine) / range < 0.15;
          if (nearResistance && data[j].volume < vsa.volumeAvg[j] * 0.8) {
            buIndex = j;
            events.push({
              type: 'BU', index: j, time: data[j].time,
              price: data[j].low, phase: 'D',
              label: 'BU', description: 'Back Up — חזרה לבדיקה. הנגד הפך לתמיכה. אישור מגמה חדשה.'
            });

            // ─── POE #2: Conservative entry at BU ───
            // Find last local low for SL
            let lastLocalLow = data[j].low;
            for (let k = j - 1; k >= Math.max(0, j - 15); k--) {
              if (data[k].low < lastLocalLow) lastLocalLow = data[k].low;
            }
            poes.push({
              type: 'conservative', index: j, time: data[j].time,
              entryPrice: data[j].close,
              stopLoss: lastLocalLow * 0.997,
              label: 'POE #2',
              description: 'איתות קנייה (שמרני): הטווח נפרץ (Back Up). סבירות גבוהה לתחילת מגמה עולה.'
            });
          }
        }
      }

      if (sosIndex !== -1) {
        phaseRanges.push({
          phase: 'D', startIdx: phaseDStart, endIdx: buIndex !== -1 ? buIndex : sosIndex + 5,
          description: 'שלב D: יציאה מהטווח. הפגין סימן עוצמה (SOS). חזרה ללא מחזור (BU) מאשרת כניסה.'
        });
      }

      // ─── Invalidation check ───
      // After Spring, if price breaks support again with high volume → pattern failed
      for (let j = springIndex + 2; j < Math.min(data.length, springIndex + 40); j++) {
        if (data[j].close < supportLine && vsa.isHighVolume[j] && (data[j].high - data[j].low) > vsa.spreadAvg[j]) {
          invalidations.push({
            index: j, time: data[j].time, price: data[j].close,
            description: 'אזהרה: היצע כבד הופיע, כשל בתהליך איסוף. תבנית בוטלה.'
          });
          break;
        }
      }
    }

    // Register this structure to prevent overlapping detections
    const structureEnd = springIndex !== -1 ? 
      Math.max(springIndex + 20, phaseBEnd + 10) : 
      phaseBEnd + 10;
    detectedRanges.push({
      lowPrice: supportLine,
      highPrice: resistanceLine,
      startIdx: scIndex,
      endIdx: structureEnd,
    });

    // Skip ahead past this structure — much larger gap to avoid splitting consolidation
    scan = Math.max(scan, structureEnd + 40);
  }

  // Determine current phase
  let currentPhase: WyckoffPhase = 'none';
  if (phaseRanges.length > 0) {
    const last = phaseRanges[phaseRanges.length - 1];
    if (last.endIdx >= data.length - 20) {
      currentPhase = last.phase;
    }
  }

  return { events, zones, poes, invalidations, currentPhase, phaseRanges };
}
