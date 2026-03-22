// Comprehensive indicator registry with calculations
import type { IndicatorDefinition, OHLCV, Point, ParamDef, LineDef } from '@/types/indicators';

// ═══════════════════════════════════════════
// MATH HELPERS
// ═══════════════════════════════════════════

function getSource(d: OHLCV, src: string): number {
  switch (src) {
    case 'open': return d.open;
    case 'high': return d.high;
    case 'low': return d.low;
    case 'hl2': return (d.high + d.low) / 2;
    case 'hlc3': return (d.high + d.low + d.close) / 3;
    case 'ohlc4': return (d.open + d.high + d.low + d.close) / 4;
    default: return d.close;
  }
}

function sma(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += values[j];
    r.push(s / period);
  }
  return r;
}

function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const r: (number | null)[] = [];
  let e: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (e === null) {
      if (i < period - 1) { r.push(null); continue; }
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      e = s / period;
    } else {
      e = values[i] * k + e * (1 - k);
    }
    r.push(e);
  }
  return r;
}

function wma(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  const denom = period * (period + 1) / 2;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let s = 0;
    for (let j = 0; j < period; j++) s += values[i - period + 1 + j] * (j + 1);
    r.push(s / denom);
  }
  return r;
}

function rma(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  let v: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (v === null) {
      if (i < period - 1) { r.push(null); continue; }
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      v = s / period;
    } else {
      v = (v * (period - 1) + values[i]) / period;
    }
    r.push(v);
  }
  return r;
}

function stdev(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += values[j];
    const avg = s / period;
    let var_ = 0;
    for (let j = i - period + 1; j <= i; j++) var_ += (values[j] - avg) ** 2;
    r.push(Math.sqrt(var_ / period));
  }
  return r;
}

function highest(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let mx = -Infinity;
    for (let j = i - period + 1; j <= i; j++) if (values[j] > mx) mx = values[j];
    r.push(mx);
  }
  return r;
}

function lowest(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let mn = Infinity;
    for (let j = i - period + 1; j <= i; j++) if (values[j] < mn) mn = values[j];
    r.push(mn);
  }
  return r;
}

function trueRange(data: OHLCV[]): number[] {
  return data.map((d, i) => {
    if (i === 0) return d.high - d.low;
    const pc = data[i - 1].close;
    return Math.max(d.high - d.low, Math.abs(d.high - pc), Math.abs(d.low - pc));
  });
}

function toPoints(data: OHLCV[], values: (number | null)[]): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < data.length; i++) {
    if (values[i] !== null && values[i] !== undefined && isFinite(values[i]!)) {
      pts.push({ time: data[i].time, value: values[i]! });
    }
  }
  return pts;
}

// ═══════════════════════════════════════════
// SOURCE PARAM (shared)
// ═══════════════════════════════════════════

const SOURCE_PARAM: ParamDef = {
  key: 'source', label: 'Source', type: 'source', default: 'close',
};

// ═══════════════════════════════════════════
// FACTORY: Simple Moving Average indicators
// ═══════════════════════════════════════════

function createMA(
  id: string, name: string, shortName: string,
  calcFn: (values: number[], period: number) => (number | null)[],
  defaultPeriod: number, defaultColor: string,
): IndicatorDefinition {
  return {
    id, name, shortName, category: 'Moving Averages', overlay: true,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: defaultPeriod, min: 1, max: 500 },
      SOURCE_PARAM,
      { key: 'offset', label: 'Offset', type: 'number', default: 0, min: -100, max: 100 },
    ],
    lines: [{ key: 'line', label: shortName, color: defaultColor, width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const vals = data.map(d => getSource(d, params.source));
      const result = calcFn(vals, params.period);
      return { line: toPoints(data, result) };
    },
  };
}

// ═══════════════════════════════════════════
// ADDITIONAL MA CALCULATIONS
// ═══════════════════════════════════════════

function dema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e1Vals = e1.map(v => v ?? 0);
  const e2 = ema(e1Vals, period);
  return values.map((_, i) => (e1[i] !== null && e2[i] !== null) ? 2 * e1[i]! - e2[i]! : null);
}

function tema(values: number[], period: number): (number | null)[] {
  const e1 = ema(values, period);
  const e1v = e1.map(v => v ?? 0);
  const e2 = ema(e1v, period);
  const e2v = e2.map(v => v ?? 0);
  const e3 = ema(e2v, period);
  return values.map((_, i) => (e1[i] !== null && e2[i] !== null && e3[i] !== null) ? 3 * e1[i]! - 3 * e2[i]! + e3[i]! : null);
}

function hma(values: number[], period: number): (number | null)[] {
  const half = Math.max(1, Math.floor(period / 2));
  const sqrtP = Math.max(1, Math.floor(Math.sqrt(period)));
  const wma1 = wma(values, half);
  const wma2 = wma(values, period);
  const diff = values.map((_, i) => (wma1[i] !== null && wma2[i] !== null) ? 2 * wma1[i]! - wma2[i]! : 0);
  return wma(diff, sqrtP);
}

function alma(values: number[], period: number): (number | null)[] {
  const offset = 0.85;
  const sigma = 6;
  const m = offset * (period - 1);
  const s = period / sigma;
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let wSum = 0, norm = 0;
    for (let j = 0; j < period; j++) {
      const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
      wSum += values[i - period + 1 + j] * w;
      norm += w;
    }
    r.push(wSum / norm);
  }
  return r;
}

function smma(values: number[], period: number): (number | null)[] {
  return rma(values, period);
}

function lsma(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { r.push(null); continue; }
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < period; j++) {
      sumX += j; sumY += values[i - period + 1 + j];
      sumXY += j * values[i - period + 1 + j]; sumX2 += j * j;
    }
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    r.push(intercept + slope * (period - 1));
  }
  return r;
}

function mcginley(values: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  let md: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (md === null) {
      if (i < period - 1) { r.push(null); continue; }
      md = values[i];
    } else {
      const ratio = values[i] / md;
      md = md + (values[i] - md) / (period * Math.pow(ratio, 4));
    }
    r.push(md);
  }
  return r;
}

// ═══════════════════════════════════════════
// ALL INDICATOR DEFINITIONS
// ═══════════════════════════════════════════

const INDICATORS: IndicatorDefinition[] = [
  // ─── Moving Averages ───
  createMA('sma', 'Simple Moving Average', 'SMA', sma, 20, '#ff9800'),
  createMA('ema', 'Exponential Moving Average', 'EMA', ema, 20, '#2196f3'),
  createMA('wma', 'Weighted Moving Average', 'WMA', wma, 20, '#9c27b0'),
  createMA('dema', 'Double EMA', 'DEMA', dema, 20, '#e91e63'),
  createMA('tema', 'Triple EMA', 'TEMA', tema, 20, '#00bcd4'),
  createMA('hma', 'Hull Moving Average', 'HMA', hma, 20, '#4caf50'),
  createMA('alma', 'Arnaud Legoux Moving Average', 'ALMA', alma, 20, '#ff5722'),
  createMA('smma', 'Smoothed Moving Average', 'SMMA', smma, 20, '#795548'),
  createMA('lsma', 'Least Squares Moving Average', 'LSMA', lsma, 20, '#607d8b'),
  createMA('mcginley', 'McGinley Dynamic', 'McGinley', mcginley, 20, '#009688'),
  createMA('linreg', 'Linear Regression Curve', 'LinReg', lsma, 20, '#3f51b5'),

  // ─── Bands & Channels ───
  {
    id: 'bbands', name: 'Bollinger Bands', shortName: 'BB',
    category: 'Bands & Channels', overlay: true,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'mult', label: 'StdDev', type: 'number', default: 2, min: 0.1, max: 10, step: 0.1 },
      SOURCE_PARAM,
    ],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'dashed', visible: true },
      { key: 'basis', label: 'Basis', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'dashed', visible: true },
    ],
    calculate: (data, params) => {
      const vals = data.map(d => getSource(d, params.source));
      const basis = sma(vals, params.period);
      const sd = stdev(vals, params.period);
      const upper = basis.map((b, i) => b !== null && sd[i] !== null ? b + params.mult * sd[i]! : null);
      const lower = basis.map((b, i) => b !== null && sd[i] !== null ? b - params.mult * sd[i]! : null);
      return { upper: toPoints(data, upper), basis: toPoints(data, basis), lower: toPoints(data, lower) };
    },
  },
  {
    id: 'bb_pctb', name: 'Bollinger Bands %B', shortName: '%B',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'mult', label: 'StdDev', type: 'number', default: 2, min: 0.1, max: 10, step: 0.1 },
    ],
    lines: [{ key: 'pctb', label: '%B', color: '#7E57C2', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const vals = data.map(d => d.close);
      const b = sma(vals, params.period);
      const sd = stdev(vals, params.period);
      const r = vals.map((v, i) => {
        if (b[i] === null || sd[i] === null || sd[i]! === 0) return null;
        const upper = b[i]! + params.mult * sd[i]!;
        const lower = b[i]! - params.mult * sd[i]!;
        return (v - lower) / (upper - lower);
      });
      return { pctb: toPoints(data, r) };
    },
  },
  {
    id: 'bb_width', name: 'Bollinger Bands Width', shortName: 'BBW',
    category: 'Volatility', overlay: false,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'mult', label: 'StdDev', type: 'number', default: 2, min: 0.1, max: 10, step: 0.1 },
    ],
    lines: [{ key: 'width', label: 'Width', color: '#26a69a', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const vals = data.map(d => d.close);
      const b = sma(vals, params.period);
      const sd = stdev(vals, params.period);
      const r = vals.map((_, i) => (b[i] !== null && sd[i] !== null && b[i]! !== 0) ? (2 * params.mult * sd[i]!) / b[i]! : null);
      return { width: toPoints(data, r) };
    },
  },
  {
    id: 'keltner', name: 'Keltner Channels', shortName: 'KC',
    category: 'Bands & Channels', overlay: true,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'mult', label: 'Multiplier', type: 'number', default: 1.5, min: 0.1, max: 10, step: 0.1 },
      { key: 'atrPeriod', label: 'ATR Length', type: 'number', default: 10, min: 1, max: 100 },
    ],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'dashed', visible: true },
      { key: 'basis', label: 'Basis', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'dashed', visible: true },
    ],
    calculate: (data, params) => {
      const vals = data.map(d => d.close);
      const basis = ema(vals, params.period);
      const tr = trueRange(data);
      const atrVals = rma(tr, params.atrPeriod);
      const upper = basis.map((b, i) => b !== null && atrVals[i] !== null ? b + params.mult * atrVals[i]! : null);
      const lower = basis.map((b, i) => b !== null && atrVals[i] !== null ? b - params.mult * atrVals[i]! : null);
      return { upper: toPoints(data, upper), basis: toPoints(data, basis), lower: toPoints(data, lower) };
    },
  },
  {
    id: 'donchian', name: 'Donchian Channels', shortName: 'DC',
    category: 'Bands & Channels', overlay: true,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 }],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'solid', visible: true },
      { key: 'basis', label: 'Basis', color: '#2196f3', width: 1, style: 'dashed', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const hi = highest(data.map(d => d.high), params.period);
      const lo = lowest(data.map(d => d.low), params.period);
      const mid = hi.map((h, i) => h !== null && lo[i] !== null ? (h + lo[i]!) / 2 : null);
      return { upper: toPoints(data, hi), basis: toPoints(data, mid), lower: toPoints(data, lo) };
    },
  },
  {
    id: 'envelopes', name: 'Envelopes', shortName: 'ENV',
    category: 'Bands & Channels', overlay: true,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 },
      { key: 'percent', label: 'Percent', type: 'number', default: 2.5, min: 0.1, max: 50, step: 0.1 },
      SOURCE_PARAM,
    ],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'solid', visible: true },
      { key: 'basis', label: 'Basis', color: '#2196f3', width: 1, style: 'dashed', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const vals = data.map(d => getSource(d, params.source));
      const basis = sma(vals, params.period);
      const pct = params.percent / 100;
      const upper = basis.map(b => b !== null ? b * (1 + pct) : null);
      const lower = basis.map(b => b !== null ? b * (1 - pct) : null);
      return { upper: toPoints(data, upper), basis: toPoints(data, basis), lower: toPoints(data, lower) };
    },
  },
  {
    id: 'price_channel', name: 'Price Channel', shortName: 'PC',
    category: 'Bands & Channels', overlay: true,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 }],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'solid', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const hi = highest(data.map(d => d.high), params.period);
      const lo = lowest(data.map(d => d.low), params.period);
      return { upper: toPoints(data, hi), lower: toPoints(data, lo) };
    },
  },
  {
    id: 'ma_channel', name: 'Moving Average Channel', shortName: 'MAC',
    category: 'Bands & Channels', overlay: true,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 }],
    lines: [
      { key: 'upper', label: 'Upper', color: '#e91e63', width: 1, style: 'solid', visible: true },
      { key: 'lower', label: 'Lower', color: '#4caf50', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const hiMA = sma(data.map(d => d.high), params.period);
      const loMA = sma(data.map(d => d.low), params.period);
      return { upper: toPoints(data, hiMA), lower: toPoints(data, loMA) };
    },
  },

  // ─── Oscillators ───
  {
    id: 'rsi', name: 'Relative Strength Index', shortName: 'RSI',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 },
      SOURCE_PARAM,
    ],
    lines: [{ key: 'rsi', label: 'RSI', color: '#7E57C2', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const changes = src.map((v, i) => i === 0 ? 0 : v - src[i - 1]);
      const gains = changes.map(c => Math.max(0, c));
      const losses = changes.map(c => Math.max(0, -c));
      const avgG = rma(gains, params.period);
      const avgL = rma(losses, params.period);
      const r = src.map((_, i) => {
        if (avgG[i] === null || avgL[i] === null) return null;
        const rs = avgL[i]! === 0 ? 100 : avgG[i]! / avgL[i]!;
        return 100 - 100 / (1 + rs);
      });
      return { rsi: toPoints(data, r) };
    },
  },
  {
    id: 'macd', name: 'MACD', shortName: 'MACD',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 12, min: 1, max: 100 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 26, min: 1, max: 200 },
      { key: 'signal', label: 'Signal Length', type: 'number', default: 9, min: 1, max: 50 },
      SOURCE_PARAM,
    ],
    lines: [
      { key: 'macd', label: 'MACD', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'signal', label: 'Signal', color: '#ff9800', width: 1, style: 'solid', visible: true },
      { key: 'histogram', label: 'Histogram', color: '#26a69a', width: 1, style: 'solid', visible: true, isHistogram: true },
    ],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const fast = ema(src, params.fast);
      const slow = ema(src, params.slow);
      const macdLine: { time: number; val: number }[] = [];
      for (let i = 0; i < data.length; i++) {
        if (fast[i] !== null && slow[i] !== null) macdLine.push({ time: data[i].time, val: fast[i]! - slow[i]! });
      }
      const macdVals = macdLine.map(p => p.val);
      const sig = ema(macdVals, params.signal);
      const macdPts: Point[] = [], sigPts: Point[] = [], histPts: Point[] = [];
      for (let i = 0; i < macdLine.length; i++) {
        macdPts.push({ time: macdLine[i].time, value: macdLine[i].val });
        if (sig[i] !== null) {
          sigPts.push({ time: macdLine[i].time, value: sig[i]! });
          histPts.push({ time: macdLine[i].time, value: macdLine[i].val - sig[i]! });
        }
      }
      return { macd: macdPts, signal: sigPts, histogram: histPts };
    },
  },
  {
    id: 'stoch', name: 'Stochastic', shortName: 'Stoch',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'kPeriod', label: '%K Length', type: 'number', default: 14, min: 1, max: 100 },
      { key: 'kSmooth', label: '%K Smooth', type: 'number', default: 1, min: 1, max: 10 },
      { key: 'dPeriod', label: '%D Length', type: 'number', default: 3, min: 1, max: 50 },
    ],
    lines: [
      { key: 'k', label: '%K', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'd', label: '%D', color: '#ff9800', width: 1, style: 'dashed', visible: true },
    ],
    calculate: (data, params) => {
      const hi = highest(data.map(d => d.high), params.kPeriod);
      const lo = lowest(data.map(d => d.low), params.kPeriod);
      const rawK = data.map((d, i) => {
        if (hi[i] === null || lo[i] === null || hi[i]! === lo[i]!) return null;
        return ((d.close - lo[i]!) / (hi[i]! - lo[i]!)) * 100;
      });
      const kVals = rawK.map(v => v ?? 0);
      const k = sma(kVals, params.kSmooth);
      const kFilt = k.map(v => v ?? 0);
      const d = sma(kFilt, params.dPeriod);
      return { k: toPoints(data, k), d: toPoints(data, d) };
    },
  },
  {
    id: 'stoch_rsi', name: 'Stochastic RSI', shortName: 'StochRSI',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'rsiPeriod', label: 'RSI Length', type: 'number', default: 14, min: 1, max: 100 },
      { key: 'stochPeriod', label: 'Stoch Length', type: 'number', default: 14, min: 1, max: 100 },
      { key: 'kSmooth', label: '%K Smooth', type: 'number', default: 3, min: 1, max: 10 },
      { key: 'dSmooth', label: '%D Smooth', type: 'number', default: 3, min: 1, max: 10 },
    ],
    lines: [
      { key: 'k', label: '%K', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'd', label: '%D', color: '#ff9800', width: 1, style: 'dashed', visible: true },
    ],
    calculate: (data, params) => {
      const src = data.map(d => d.close);
      const changes = src.map((v, i) => i === 0 ? 0 : v - src[i - 1]);
      const gains = changes.map(c => Math.max(0, c));
      const losses = changes.map(c => Math.max(0, -c));
      const avgG = rma(gains, params.rsiPeriod);
      const avgL = rma(losses, params.rsiPeriod);
      const rsiVals = src.map((_, i) => {
        if (avgG[i] === null || avgL[i] === null) return 0;
        const rs = avgL[i]! === 0 ? 100 : avgG[i]! / avgL[i]!;
        return 100 - 100 / (1 + rs);
      });
      const hi = highest(rsiVals, params.stochPeriod);
      const lo = lowest(rsiVals, params.stochPeriod);
      const rawK = rsiVals.map((v, i) => {
        if (hi[i] === null || lo[i] === null || hi[i]! === lo[i]!) return null;
        return ((v - lo[i]!) / (hi[i]! - lo[i]!)) * 100;
      });
      const k = sma(rawK.map(v => v ?? 0), params.kSmooth);
      const d = sma(k.map(v => v ?? 0), params.dSmooth);
      return { k: toPoints(data, k), d: toPoints(data, d) };
    },
  },
  {
    id: 'cci', name: 'Commodity Channel Index', shortName: 'CCI',
    category: 'Oscillators', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 300 }],
    lines: [{ key: 'cci', label: 'CCI', color: '#26a69a', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const tp = data.map(d => (d.high + d.low + d.close) / 3);
      const tpSma = sma(tp, params.period);
      const r = tp.map((v, i) => {
        if (tpSma[i] === null) return null;
        let mad = 0;
        for (let j = i - params.period + 1; j <= i; j++) {
          if (j >= 0) mad += Math.abs(tp[j] - tpSma[i]!);
        }
        mad /= params.period;
        return mad === 0 ? 0 : (v - tpSma[i]!) / (0.015 * mad);
      });
      return { cci: toPoints(data, r) };
    },
  },
  {
    id: 'williams_r', name: 'Williams %R', shortName: '%R',
    category: 'Oscillators', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'r', label: '%R', color: '#e91e63', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const hi = highest(data.map(d => d.high), params.period);
      const lo = lowest(data.map(d => d.low), params.period);
      const r = data.map((d, i) => {
        if (hi[i] === null || lo[i] === null || hi[i]! === lo[i]!) return null;
        return ((hi[i]! - d.close) / (hi[i]! - lo[i]!)) * -100;
      });
      return { r: toPoints(data, r) };
    },
  },
  {
    id: 'momentum', name: 'Momentum', shortName: 'MOM',
    category: 'Momentum', overlay: false,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 10, min: 1, max: 200 },
      SOURCE_PARAM,
    ],
    lines: [{ key: 'mom', label: 'MOM', color: '#2196f3', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const r = src.map((v, i) => i >= params.period ? v - src[i - params.period] : null);
      return { mom: toPoints(data, r) };
    },
  },
  {
    id: 'roc', name: 'Rate Of Change', shortName: 'ROC',
    category: 'Momentum', overlay: false,
    params: [
      { key: 'period', label: 'Length', type: 'number', default: 9, min: 1, max: 200 },
      SOURCE_PARAM,
    ],
    lines: [{ key: 'roc', label: 'ROC', color: '#ff9800', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const r = src.map((v, i) => i >= params.period && src[i - params.period] !== 0 ? ((v - src[i - params.period]) / src[i - params.period]) * 100 : null);
      return { roc: toPoints(data, r) };
    },
  },
  {
    id: 'trix', name: 'TRIX', shortName: 'TRIX',
    category: 'Momentum', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 18, min: 1, max: 200 }],
    lines: [{ key: 'trix', label: 'TRIX', color: '#9c27b0', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => d.close);
      const e1 = ema(src, params.period);
      const e2 = ema(e1.map(v => v ?? 0), params.period);
      const e3 = ema(e2.map(v => v ?? 0), params.period);
      const r = e3.map((v, i) => {
        if (v === null || i === 0 || e3[i - 1] === null || e3[i - 1]! === 0) return null;
        return ((v - e3[i - 1]!) / e3[i - 1]!) * 10000;
      });
      return { trix: toPoints(data, r) };
    },
  },
  {
    id: 'awesome', name: 'Awesome Oscillator', shortName: 'AO',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 5, min: 1, max: 100 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 34, min: 1, max: 200 },
    ],
    lines: [{ key: 'ao', label: 'AO', color: '#26a69a', width: 1, style: 'solid', visible: true, isHistogram: true }],
    calculate: (data, params) => {
      const hl2 = data.map(d => (d.high + d.low) / 2);
      const fast = sma(hl2, params.fast);
      const slow = sma(hl2, params.slow);
      const r = hl2.map((_, i) => fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : null);
      return { ao: toPoints(data, r) };
    },
  },
  {
    id: 'ult_osc', name: 'Ultimate Oscillator', shortName: 'UO',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'p1', label: 'Period 1', type: 'number', default: 7, min: 1, max: 50 },
      { key: 'p2', label: 'Period 2', type: 'number', default: 14, min: 1, max: 100 },
      { key: 'p3', label: 'Period 3', type: 'number', default: 28, min: 1, max: 200 },
    ],
    lines: [{ key: 'uo', label: 'UO', color: '#ff5722', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const bp: number[] = [];
      const tr_: number[] = [];
      for (let i = 0; i < data.length; i++) {
        const pc = i > 0 ? data[i - 1].close : data[i].close;
        bp.push(data[i].close - Math.min(data[i].low, pc));
        tr_.push(Math.max(data[i].high, pc) - Math.min(data[i].low, pc));
      }
      const r: (number | null)[] = [];
      const maxP = Math.max(params.p1, params.p2, params.p3);
      for (let i = 0; i < data.length; i++) {
        if (i < maxP - 1) { r.push(null); continue; }
        let s1 = 0, t1 = 0, s2 = 0, t2 = 0, s3 = 0, t3 = 0;
        for (let j = i - params.p1 + 1; j <= i; j++) { s1 += bp[j]; t1 += tr_[j]; }
        for (let j = i - params.p2 + 1; j <= i; j++) { s2 += bp[j]; t2 += tr_[j]; }
        for (let j = i - params.p3 + 1; j <= i; j++) { s3 += bp[j]; t3 += tr_[j]; }
        const avg1 = t1 !== 0 ? s1 / t1 : 0;
        const avg2 = t2 !== 0 ? s2 / t2 : 0;
        const avg3 = t3 !== 0 ? s3 / t3 : 0;
        r.push(100 * (4 * avg1 + 2 * avg2 + avg3) / 7);
      }
      return { uo: toPoints(data, r) };
    },
  },
  {
    id: 'dpo', name: 'Detrended Price Oscillator', shortName: 'DPO',
    category: 'Oscillators', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 21, min: 1, max: 200 }, SOURCE_PARAM],
    lines: [{ key: 'dpo', label: 'DPO', color: '#607d8b', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const ma = sma(src, params.period);
      const shift = Math.floor(params.period / 2) + 1;
      const r = src.map((v, i) => {
        const maIdx = i + shift;
        if (maIdx >= ma.length || ma[maIdx] === null) return i >= params.period ? v - (ma[i] ?? v) : null;
        return v - ma[maIdx]!;
      });
      return { dpo: toPoints(data, r) };
    },
  },
  {
    id: 'cmo', name: 'Chande Momentum Oscillator', shortName: 'CMO',
    category: 'Momentum', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 9, min: 1, max: 100 }, SOURCE_PARAM],
    lines: [{ key: 'cmo', label: 'CMO', color: '#00bcd4', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const r: (number | null)[] = [];
      for (let i = 0; i < src.length; i++) {
        if (i < params.period) { r.push(null); continue; }
        let sU = 0, sD = 0;
        for (let j = i - params.period + 1; j <= i; j++) {
          const diff = src[j] - src[j - 1];
          if (diff > 0) sU += diff; else sD -= diff;
        }
        r.push(sU + sD !== 0 ? 100 * (sU - sD) / (sU + sD) : 0);
      }
      return { cmo: toPoints(data, r) };
    },
  },
  {
    id: 'fisher', name: 'Fisher Transform', shortName: 'Fisher',
    category: 'Oscillators', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 9, min: 1, max: 100 }],
    lines: [
      { key: 'fisher', label: 'Fisher', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'trigger', label: 'Trigger', color: '#ff9800', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const hl2 = data.map(d => (d.high + d.low) / 2);
      const hi = highest(hl2, params.period);
      const lo = lowest(hl2, params.period);
      let fish = 0, prevFish = 0;
      const fishPts: Point[] = [], trigPts: Point[] = [];
      for (let i = 0; i < data.length; i++) {
        if (hi[i] === null || lo[i] === null) continue;
        const range = hi[i]! - lo[i]!;
        let val = range !== 0 ? 2 * ((hl2[i] - lo[i]!) / range - 0.5) : 0;
        val = Math.max(-0.999, Math.min(0.999, val * 0.67 + (i > 0 ? val * 0.33 : 0)));
        prevFish = fish;
        fish = 0.5 * Math.log((1 + val) / (1 - val)) + 0.5 * prevFish;
        fishPts.push({ time: data[i].time, value: fish });
        trigPts.push({ time: data[i].time, value: prevFish });
      }
      return { fisher: fishPts, trigger: trigPts };
    },
  },
  {
    id: 'tsi', name: 'True Strength Indicator', shortName: 'TSI',
    category: 'Momentum', overlay: false,
    params: [
      { key: 'long', label: 'Long Length', type: 'number', default: 25, min: 1, max: 100 },
      { key: 'short', label: 'Short Length', type: 'number', default: 13, min: 1, max: 50 },
      { key: 'signal', label: 'Signal', type: 'number', default: 13, min: 1, max: 50 },
    ],
    lines: [
      { key: 'tsi', label: 'TSI', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'signal', label: 'Signal', color: '#ff9800', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const pc = data.map((d, i) => i === 0 ? 0 : d.close - data[i - 1].close);
      const apc = pc.map(v => Math.abs(v));
      const ds = ema(ema(pc, params.long).map(v => v ?? 0), params.short);
      const ads = ema(ema(apc, params.long).map(v => v ?? 0), params.short);
      const tsiVals = ds.map((v, i) => v !== null && ads[i] !== null && ads[i]! !== 0 ? 100 * v / ads[i]! : null);
      const sig = ema(tsiVals.map(v => v ?? 0), params.signal);
      return { tsi: toPoints(data, tsiVals), signal: toPoints(data, sig) };
    },
  },
  {
    id: 'connors_rsi', name: 'Connors RSI', shortName: 'CRSI',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'rsiPeriod', label: 'RSI Length', type: 'number', default: 3, min: 1, max: 50 },
      { key: 'streakPeriod', label: 'Streak Length', type: 'number', default: 2, min: 1, max: 50 },
      { key: 'pctPeriod', label: 'Pct Rank Length', type: 'number', default: 100, min: 1, max: 200 },
    ],
    lines: [{ key: 'crsi', label: 'CRSI', color: '#e91e63', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      // Simplified Connors RSI
      const src = data.map(d => d.close);
      const changes = src.map((v, i) => i === 0 ? 0 : v - src[i - 1]);
      const gains = changes.map(c => Math.max(0, c));
      const losses = changes.map(c => Math.max(0, -c));
      const avgG = rma(gains, params.rsiPeriod);
      const avgL = rma(losses, params.rsiPeriod);
      const rsiVals = src.map((_, i) => {
        if (avgG[i] === null || avgL[i] === null) return null;
        const rs = avgL[i]! === 0 ? 100 : avgG[i]! / avgL[i]!;
        return 100 - 100 / (1 + rs);
      });
      return { crsi: toPoints(data, rsiVals) };
    },
  },
  {
    id: 'coppock', name: 'Coppock Curve', shortName: 'Coppock',
    category: 'Momentum', overlay: false,
    params: [
      { key: 'wma', label: 'WMA Length', type: 'number', default: 10, min: 1, max: 50 },
      { key: 'long', label: 'Long ROC', type: 'number', default: 14, min: 1, max: 100 },
      { key: 'short', label: 'Short ROC', type: 'number', default: 11, min: 1, max: 100 },
    ],
    lines: [{ key: 'coppock', label: 'Coppock', color: '#4caf50', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => d.close);
      const rocLong = src.map((v, i) => i >= params.long && src[i - params.long] !== 0 ? ((v - src[i - params.long]) / src[i - params.long]) * 100 : 0);
      const rocShort = src.map((v, i) => i >= params.short && src[i - params.short] !== 0 ? ((v - src[i - params.short]) / src[i - params.short]) * 100 : 0);
      const combined = rocLong.map((v, i) => v + rocShort[i]);
      const result = wma(combined, params.wma);
      return { coppock: toPoints(data, result) };
    },
  },

  // ─── Trend ───
  {
    id: 'supertrend', name: 'SuperTrend', shortName: 'ST',
    category: 'Trend', overlay: true,
    params: [
      { key: 'period', label: 'ATR Length', type: 'number', default: 10, min: 1, max: 100 },
      { key: 'mult', label: 'Multiplier', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5 },
    ],
    lines: [
      { key: 'up', label: 'Up', color: '#4caf50', width: 2, style: 'solid', visible: true },
      { key: 'down', label: 'Down', color: '#ef5350', width: 2, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const atrVals = rma(tr, params.period);
      const upPts: Point[] = [], downPts: Point[] = [];
      let trend = 1;
      let upperBand = 0, lowerBand = 0;
      for (let i = 0; i < data.length; i++) {
        if (atrVals[i] === null) continue;
        const hl2 = (data[i].high + data[i].low) / 2;
        let ub = hl2 + params.mult * atrVals[i]!;
        let lb = hl2 - params.mult * atrVals[i]!;
        if (i > 0) {
          lb = lb > lowerBand || data[i - 1].close < lowerBand ? lb : lowerBand;
          ub = ub < upperBand || data[i - 1].close > upperBand ? ub : upperBand;
        }
        if (i > 0) {
          if (trend === 1 && data[i].close < lowerBand) trend = -1;
          else if (trend === -1 && data[i].close > upperBand) trend = 1;
        }
        upperBand = ub; lowerBand = lb;
        if (trend === 1) upPts.push({ time: data[i].time, value: lowerBand });
        else downPts.push({ time: data[i].time, value: upperBand });
      }
      return { up: upPts, down: downPts };
    },
  },
  {
    id: 'psar', name: 'Parabolic SAR', shortName: 'SAR',
    category: 'Trend', overlay: true,
    params: [
      { key: 'start', label: 'Start', type: 'number', default: 0.02, min: 0.001, max: 0.1, step: 0.001 },
      { key: 'increment', label: 'Increment', type: 'number', default: 0.02, min: 0.001, max: 0.1, step: 0.001 },
      { key: 'max', label: 'Maximum', type: 'number', default: 0.2, min: 0.01, max: 1, step: 0.01 },
    ],
    lines: [{ key: 'sar', label: 'SAR', color: '#2196f3', width: 1, style: 'dotted', visible: true }],
    calculate: (data, params) => {
      if (data.length < 2) return { sar: [] };
      const pts: Point[] = [];
      let isLong = data[1].close > data[0].close;
      let sar = isLong ? data[0].low : data[0].high;
      let ep = isLong ? data[1].high : data[1].low;
      let af = params.start;
      for (let i = 1; i < data.length; i++) {
        sar = sar + af * (ep - sar);
        if (isLong) {
          if (i > 1) sar = Math.min(sar, data[i - 1].low, data[i - 2]?.low ?? data[i - 1].low);
          if (data[i].low < sar) {
            isLong = false; sar = ep; ep = data[i].low; af = params.start;
          } else {
            if (data[i].high > ep) { ep = data[i].high; af = Math.min(af + params.increment, params.max); }
          }
        } else {
          if (i > 1) sar = Math.max(sar, data[i - 1].high, data[i - 2]?.high ?? data[i - 1].high);
          if (data[i].high > sar) {
            isLong = true; sar = ep; ep = data[i].high; af = params.start;
          } else {
            if (data[i].low < ep) { ep = data[i].low; af = Math.min(af + params.increment, params.max); }
          }
        }
        pts.push({ time: data[i].time, value: sar });
      }
      return { sar: pts };
    },
  },
  {
    id: 'ichimoku', name: 'Ichimoku Cloud', shortName: 'Ichimoku',
    category: 'Trend', overlay: true,
    params: [
      { key: 'tenkan', label: 'Tenkan', type: 'number', default: 9, min: 1, max: 100 },
      { key: 'kijun', label: 'Kijun', type: 'number', default: 26, min: 1, max: 100 },
      { key: 'senkou', label: 'Senkou Span B', type: 'number', default: 52, min: 1, max: 200 },
    ],
    lines: [
      { key: 'tenkan', label: 'Tenkan', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'kijun', label: 'Kijun', color: '#e91e63', width: 1, style: 'solid', visible: true },
      { key: 'senkouA', label: 'Senkou A', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'senkouB', label: 'Senkou B', color: '#ef5350', width: 1, style: 'solid', visible: true },
      { key: 'chikou', label: 'Chikou', color: '#9c27b0', width: 1, style: 'dashed', visible: true },
    ],
    calculate: (data, params) => {
      const donchianMid = (period: number) => {
        const hi = highest(data.map(d => d.high), period);
        const lo = lowest(data.map(d => d.low), period);
        return hi.map((h, i) => h !== null && lo[i] !== null ? (h + lo[i]!) / 2 : null);
      };
      const tenkanVals = donchianMid(params.tenkan);
      const kijunVals = donchianMid(params.kijun);
      const senkouBRaw = donchianMid(params.senkou);
      return {
        tenkan: toPoints(data, tenkanVals),
        kijun: toPoints(data, kijunVals),
        senkouA: toPoints(data, tenkanVals.map((t, i) => t !== null && kijunVals[i] !== null ? (t + kijunVals[i]!) / 2 : null)),
        senkouB: toPoints(data, senkouBRaw),
        chikou: data.map(d => ({ time: d.time, value: d.close })),
      };
    },
  },
  {
    id: 'pivot', name: 'Pivot Points Standard', shortName: 'Pivot',
    category: 'Trend', overlay: true,
    params: [],
    lines: [
      { key: 'p', label: 'P', color: '#ff9800', width: 1, style: 'dashed', visible: true },
      { key: 'r1', label: 'R1', color: '#ef5350', width: 1, style: 'dotted', visible: true },
      { key: 's1', label: 'S1', color: '#4caf50', width: 1, style: 'dotted', visible: true },
    ],
    calculate: (data) => {
      if (data.length === 0) return { p: [], r1: [], s1: [] };
      const last = data[data.length - 1];
      const pivot = (last.high + last.low + last.close) / 3;
      const r1 = 2 * pivot - last.low;
      const s1 = 2 * pivot - last.high;
      const pts = data.map(d => ({ time: d.time, value: pivot }));
      const r1pts = data.map(d => ({ time: d.time, value: r1 }));
      const s1pts = data.map(d => ({ time: d.time, value: s1 }));
      return { p: pts, r1: r1pts, s1: s1pts };
    },
  },

  // ─── Volume ───
  {
    id: 'volume', name: 'Volume', shortName: 'Vol',
    category: 'Volume', overlay: false,
    params: [],
    lines: [{ key: 'vol', label: 'Volume', color: '#26a69a', width: 1, style: 'solid', visible: true, isHistogram: true }],
    calculate: (data) => ({
      vol: data.map(d => ({ time: d.time, value: d.volume })),
    }),
  },
  {
    id: 'obv', name: 'On Balance Volume', shortName: 'OBV',
    category: 'Volume', overlay: false,
    params: [],
    lines: [{ key: 'obv', label: 'OBV', color: '#2196f3', width: 1, style: 'solid', visible: true }],
    calculate: (data) => {
      let obv = 0;
      const pts: Point[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i > 0) {
          if (data[i].close > data[i - 1].close) obv += data[i].volume;
          else if (data[i].close < data[i - 1].close) obv -= data[i].volume;
        }
        pts.push({ time: data[i].time, value: obv });
      }
      return { obv: pts };
    },
  },
  {
    id: 'ad', name: 'Accumulation/Distribution', shortName: 'A/D',
    category: 'Volume', overlay: false,
    params: [],
    lines: [{ key: 'ad', label: 'A/D', color: '#ff9800', width: 1, style: 'solid', visible: true }],
    calculate: (data) => {
      let ad = 0;
      const pts: Point[] = [];
      for (const d of data) {
        const mfm = d.high !== d.low ? ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low) : 0;
        ad += mfm * d.volume;
        pts.push({ time: d.time, value: ad });
      }
      return { ad: pts };
    },
  },
  {
    id: 'cmf', name: 'Chaikin Money Flow', shortName: 'CMF',
    category: 'Volume', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 100 }],
    lines: [{ key: 'cmf', label: 'CMF', color: '#26a69a', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const mfv = data.map(d => {
        const mfm = d.high !== d.low ? ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low) : 0;
        return mfm * d.volume;
      });
      const r: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period - 1) { r.push(null); continue; }
        let sumMFV = 0, sumVol = 0;
        for (let j = i - params.period + 1; j <= i; j++) { sumMFV += mfv[j]; sumVol += data[j].volume; }
        r.push(sumVol !== 0 ? sumMFV / sumVol : 0);
      }
      return { cmf: toPoints(data, r) };
    },
  },
  {
    id: 'mfi', name: 'Money Flow Index', shortName: 'MFI',
    category: 'Volume', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'mfi', label: 'MFI', color: '#9c27b0', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const tp = data.map(d => (d.high + d.low + d.close) / 3);
      const r: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period) { r.push(null); continue; }
        let pmf = 0, nmf = 0;
        for (let j = i - params.period + 1; j <= i; j++) {
          const mf = tp[j] * data[j].volume;
          if (tp[j] > tp[j - 1]) pmf += mf; else nmf += mf;
        }
        r.push(nmf === 0 ? 100 : 100 - 100 / (1 + pmf / nmf));
      }
      return { mfi: toPoints(data, r) };
    },
  },
  {
    id: 'vwap', name: 'VWAP', shortName: 'VWAP',
    category: 'Volume', overlay: true,
    params: [],
    lines: [{ key: 'vwap', label: 'VWAP', color: '#2196f3', width: 2, style: 'solid', visible: true }],
    calculate: (data) => {
      let cumPV = 0, cumVol = 0;
      const pts: Point[] = [];
      for (const d of data) {
        const tp = (d.high + d.low + d.close) / 3;
        cumPV += tp * d.volume; cumVol += d.volume;
        pts.push({ time: d.time, value: cumVol !== 0 ? cumPV / cumVol : tp });
      }
      return { vwap: pts };
    },
  },
  {
    id: 'vwma', name: 'VWMA', shortName: 'VWMA',
    category: 'Volume', overlay: true,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 500 }, SOURCE_PARAM],
    lines: [{ key: 'vwma', label: 'VWMA', color: '#ff5722', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const r: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period - 1) { r.push(null); continue; }
        let sumSV = 0, sumV = 0;
        for (let j = i - params.period + 1; j <= i; j++) { sumSV += src[j] * data[j].volume; sumV += data[j].volume; }
        r.push(sumV !== 0 ? sumSV / sumV : null);
      }
      return { vwma: toPoints(data, r) };
    },
  },
  {
    id: 'vol_osc', name: 'Volume Oscillator', shortName: 'VolOsc',
    category: 'Volume', overlay: false,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 5, min: 1, max: 50 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 10, min: 1, max: 100 },
    ],
    lines: [{ key: 'osc', label: 'Osc', color: '#2196f3', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const vol = data.map(d => d.volume);
      const fast = ema(vol, params.fast);
      const slow = ema(vol, params.slow);
      const r = vol.map((_, i) => fast[i] !== null && slow[i] !== null && slow[i]! !== 0 ? ((fast[i]! - slow[i]!) / slow[i]!) * 100 : null);
      return { osc: toPoints(data, r) };
    },
  },
  {
    id: 'net_volume', name: 'Net Volume', shortName: 'NetVol',
    category: 'Volume', overlay: false,
    params: [],
    lines: [{ key: 'net', label: 'Net Volume', color: '#26a69a', width: 1, style: 'solid', visible: true, isHistogram: true }],
    calculate: (data) => ({
      net: data.map((d, i) => ({
        time: d.time,
        value: i === 0 || d.close >= data[i - 1].close ? d.volume : -d.volume,
      })),
    }),
  },

  // ─── Trend Strength ───
  {
    id: 'adx', name: 'Average Directional Index', shortName: 'ADX',
    category: 'Trend', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [
      { key: 'adx', label: 'ADX', color: '#ff9800', width: 2, style: 'solid', visible: true },
      { key: 'pdi', label: '+DI', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'ndi', label: '-DI', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const pdm: number[] = [0], ndm: number[] = [0];
      for (let i = 1; i < data.length; i++) {
        const up = data[i].high - data[i - 1].high;
        const down = data[i - 1].low - data[i].low;
        pdm.push(up > down && up > 0 ? up : 0);
        ndm.push(down > up && down > 0 ? down : 0);
      }
      const atrV = rma(tr, params.period);
      const pdmS = rma(pdm, params.period);
      const ndmS = rma(ndm, params.period);
      const pdi = pdmS.map((v, i) => v !== null && atrV[i] !== null && atrV[i]! !== 0 ? 100 * v / atrV[i]! : null);
      const ndi = ndmS.map((v, i) => v !== null && atrV[i] !== null && atrV[i]! !== 0 ? 100 * v / atrV[i]! : null);
      const dx = pdi.map((p, i) => p !== null && ndi[i] !== null && (p + ndi[i]!) !== 0 ? 100 * Math.abs(p - ndi[i]!) / (p + ndi[i]!) : null);
      const adxV = rma(dx.map(v => v ?? 0), params.period);
      return { adx: toPoints(data, adxV), pdi: toPoints(data, pdi), ndi: toPoints(data, ndi) };
    },
  },
  {
    id: 'aroon', name: 'Aroon', shortName: 'Aroon',
    category: 'Trend', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 200 }],
    lines: [
      { key: 'up', label: 'Aroon Up', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'down', label: 'Aroon Down', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const upPts: Point[] = [], downPts: Point[] = [];
      for (let i = params.period; i < data.length; i++) {
        let hiIdx = 0, loIdx = 0, hi = -Infinity, lo = Infinity;
        for (let j = 0; j <= params.period; j++) {
          const idx = i - params.period + j;
          if (data[idx].high > hi) { hi = data[idx].high; hiIdx = j; }
          if (data[idx].low < lo) { lo = data[idx].low; loIdx = j; }
        }
        upPts.push({ time: data[i].time, value: (hiIdx / params.period) * 100 });
        downPts.push({ time: data[i].time, value: (loIdx / params.period) * 100 });
      }
      return { up: upPts, down: downPts };
    },
  },
  {
    id: 'chop', name: 'Choppiness Index', shortName: 'CHOP',
    category: 'Trend', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'chop', label: 'CHOP', color: '#607d8b', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const r: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period) { r.push(null); continue; }
        let sumTR = 0, hi = -Infinity, lo = Infinity;
        for (let j = i - params.period + 1; j <= i; j++) {
          sumTR += tr[j]; hi = Math.max(hi, data[j].high); lo = Math.min(lo, data[j].low);
        }
        const range = hi - lo;
        r.push(range !== 0 ? 100 * Math.log10(sumTR / range) / Math.log10(params.period) : 50);
      }
      return { chop: toPoints(data, r) };
    },
  },
  {
    id: 'vortex', name: 'Vortex Indicator', shortName: 'Vortex',
    category: 'Trend', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [
      { key: 'plus', label: 'VI+', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'minus', label: 'VI-', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const vm_plus: number[] = [0], vm_minus: number[] = [0];
      for (let i = 1; i < data.length; i++) {
        vm_plus.push(Math.abs(data[i].high - data[i - 1].low));
        vm_minus.push(Math.abs(data[i].low - data[i - 1].high));
      }
      const r_plus: (number | null)[] = [], r_minus: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period) { r_plus.push(null); r_minus.push(null); continue; }
        let sTR = 0, sPlus = 0, sMinus = 0;
        for (let j = i - params.period + 1; j <= i; j++) { sTR += tr[j]; sPlus += vm_plus[j]; sMinus += vm_minus[j]; }
        r_plus.push(sTR !== 0 ? sPlus / sTR : 0);
        r_minus.push(sTR !== 0 ? sMinus / sTR : 0);
      }
      return { plus: toPoints(data, r_plus), minus: toPoints(data, r_minus) };
    },
  },
  {
    id: 'bop', name: 'Balance of Power', shortName: 'BOP',
    category: 'Momentum', overlay: false,
    params: [{ key: 'period', label: 'Smooth', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'bop', label: 'BOP', color: '#00bcd4', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const raw = data.map(d => d.high !== d.low ? (d.close - d.open) / (d.high - d.low) : 0);
      const smoothed = sma(raw, params.period);
      return { bop: toPoints(data, smoothed) };
    },
  },

  // ─── Volatility ───
  {
    id: 'atr', name: 'Average True Range', shortName: 'ATR',
    category: 'Volatility', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'atr', label: 'ATR', color: '#ff9800', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const atrV = rma(tr, params.period);
      return { atr: toPoints(data, atrV) };
    },
  },
  {
    id: 'hist_vol', name: 'Historical Volatility', shortName: 'HV',
    category: 'Volatility', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 200 }],
    lines: [{ key: 'hv', label: 'HV', color: '#9c27b0', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const logRet = data.map((d, i) => i === 0 ? 0 : Math.log(d.close / data[i - 1].close));
      const sd = stdev(logRet, params.period);
      const r = sd.map(v => v !== null ? v * Math.sqrt(252) * 100 : null);
      return { hv: toPoints(data, r) };
    },
  },
  {
    id: 'stddev', name: 'Standard Deviation', shortName: 'StdDev',
    category: 'Volatility', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 200 }, SOURCE_PARAM],
    lines: [{ key: 'sd', label: 'StdDev', color: '#607d8b', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const sd = stdev(src, params.period);
      return { sd: toPoints(data, sd) };
    },
  },

  // ─── Additional popular indicators ───
  {
    id: 'ema_cross', name: 'EMA Cross', shortName: 'EMA Cross',
    category: 'Moving Averages', overlay: true,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 9, min: 1, max: 200 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 21, min: 1, max: 500 },
      SOURCE_PARAM,
    ],
    lines: [
      { key: 'fast', label: 'Fast', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'slow', label: 'Slow', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      return { fast: toPoints(data, ema(src, params.fast)), slow: toPoints(data, ema(src, params.slow)) };
    },
  },
  {
    id: 'ma_cross', name: 'MA Cross', shortName: 'MA Cross',
    category: 'Moving Averages', overlay: true,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 9, min: 1, max: 200 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 21, min: 1, max: 500 },
      SOURCE_PARAM,
    ],
    lines: [
      { key: 'fast', label: 'Fast', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'slow', label: 'Slow', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      return { fast: toPoints(data, sma(src, params.fast)), slow: toPoints(data, sma(src, params.slow)) };
    },
  },
  {
    id: 'chaikin_osc', name: 'Chaikin Oscillator', shortName: 'ChaikinOsc',
    category: 'Volume', overlay: false,
    params: [
      { key: 'fast', label: 'Fast Length', type: 'number', default: 3, min: 1, max: 50 },
      { key: 'slow', label: 'Slow Length', type: 'number', default: 10, min: 1, max: 100 },
    ],
    lines: [{ key: 'co', label: 'ChaikinOsc', color: '#2196f3', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      // A/D line
      let ad = 0;
      const adLine = data.map(d => {
        const mfm = d.high !== d.low ? ((d.close - d.low) - (d.high - d.close)) / (d.high - d.low) : 0;
        ad += mfm * d.volume;
        return ad;
      });
      const fast = ema(adLine, params.fast);
      const slow = ema(adLine, params.slow);
      const r = adLine.map((_, i) => fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : null);
      return { co: toPoints(data, r) };
    },
  },
  {
    id: 'elder_force', name: "Elder's Force Index", shortName: 'EFI',
    category: 'Momentum', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 13, min: 1, max: 100 }],
    lines: [{ key: 'efi', label: 'EFI', color: '#4caf50', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const raw = data.map((d, i) => i === 0 ? 0 : (d.close - data[i - 1].close) * d.volume);
      const smoothed = ema(raw, params.period);
      return { efi: toPoints(data, smoothed) };
    },
  },
  {
    id: 'mass_index', name: 'Mass Index', shortName: 'MI',
    category: 'Volatility', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 25, min: 1, max: 100 }],
    lines: [{ key: 'mi', label: 'MI', color: '#ff5722', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const range = data.map(d => d.high - d.low);
      const e1 = ema(range, 9);
      const e2 = ema(e1.map(v => v ?? 0), 9);
      const ratio = e1.map((v, i) => v !== null && e2[i] !== null && e2[i]! !== 0 ? v / e2[i]! : null);
      const r: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < params.period - 1) { r.push(null); continue; }
        let sum = 0;
        for (let j = i - params.period + 1; j <= i; j++) sum += ratio[j] ?? 1;
        r.push(sum);
      }
      return { mi: toPoints(data, r) };
    },
  },
  {
    id: 'klinger', name: 'Klinger Oscillator', shortName: 'KVO',
    category: 'Volume', overlay: false,
    params: [
      { key: 'fast', label: 'Fast', type: 'number', default: 34, min: 1, max: 100 },
      { key: 'slow', label: 'Slow', type: 'number', default: 55, min: 1, max: 200 },
      { key: 'signal', label: 'Signal', type: 'number', default: 13, min: 1, max: 50 },
    ],
    lines: [
      { key: 'kvo', label: 'KVO', color: '#2196f3', width: 1, style: 'solid', visible: true },
      { key: 'signal', label: 'Signal', color: '#ff9800', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const hlc = data.map(d => d.high + d.low + d.close);
      const vf = data.map((d, i) => {
        const trend = i === 0 ? 1 : (hlc[i] > hlc[i - 1] ? 1 : -1);
        const dm = d.high - d.low;
        const cm = i === 0 ? dm : (hlc[i] > hlc[i - 1] === (hlc[i - 1] > (i > 1 ? hlc[i - 2] : 0)) ? dm + dm : dm);
        return d.volume * Math.abs(2 * (dm / (cm || 1)) - 1) * trend * 100;
      });
      const fast = ema(vf, params.fast);
      const slow = ema(vf, params.slow);
      const kvo = vf.map((_, i) => fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : null);
      const sig = ema(kvo.map(v => v ?? 0), params.signal);
      return { kvo: toPoints(data, kvo), signal: toPoints(data, sig) };
    },
  },
  {
    id: 'price_osc', name: 'Price Oscillator', shortName: 'PPO',
    category: 'Momentum', overlay: false,
    params: [
      { key: 'fast', label: 'Fast', type: 'number', default: 12, min: 1, max: 100 },
      { key: 'slow', label: 'Slow', type: 'number', default: 26, min: 1, max: 200 },
      SOURCE_PARAM,
    ],
    lines: [{ key: 'ppo', label: 'PPO', color: '#e91e63', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const fast = ema(src, params.fast);
      const slow = ema(src, params.slow);
      const r = src.map((_, i) => fast[i] !== null && slow[i] !== null && slow[i]! !== 0 ? ((fast[i]! - slow[i]!) / slow[i]!) * 100 : null);
      return { ppo: toPoints(data, r) };
    },
  },
  {
    id: 'rvi', name: 'Relative Vigor Index', shortName: 'RVI',
    category: 'Oscillators', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 10, min: 1, max: 100 }],
    lines: [
      { key: 'rvi', label: 'RVI', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'signal', label: 'Signal', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const num: number[] = [], den: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < 3) { num.push(0); den.push(0); continue; }
        const a = data[i].close - data[i].open;
        const b = data[i - 1].close - data[i - 1].open;
        const c = data[i - 2].close - data[i - 2].open;
        const d2 = data[i - 3].close - data[i - 3].open;
        num.push((a + 2 * b + 2 * c + d2) / 6);
        const e = data[i].high - data[i].low;
        const f = data[i - 1].high - data[i - 1].low;
        const g = data[i - 2].high - data[i - 2].low;
        const h = data[i - 3].high - data[i - 3].low;
        den.push((e + 2 * f + 2 * g + h) / 6);
      }
      const numS = sma(num, params.period);
      const denS = sma(den, params.period);
      const rviVals = numS.map((n, i) => n !== null && denS[i] !== null && denS[i]! !== 0 ? n / denS[i]! : null);
      const sigVals: (number | null)[] = [];
      for (let i = 0; i < rviVals.length; i++) {
        if (i < 3 || rviVals[i] === null) { sigVals.push(null); continue; }
        const a = rviVals[i]!;
        const b = rviVals[i - 1] ?? 0;
        const c = rviVals[i - 2] ?? 0;
        const d = rviVals[i - 3] ?? 0;
        sigVals.push((a + 2 * b + 2 * c + d) / 6);
      }
      return { rvi: toPoints(data, rviVals), signal: toPoints(data, sigVals) };
    },
  },
  {
    id: 'avg_price', name: 'Average Price', shortName: 'AvgPrice',
    category: 'Moving Averages', overlay: true,
    params: [],
    lines: [{ key: 'line', label: 'AvgPrice', color: '#607d8b', width: 1, style: 'solid', visible: true }],
    calculate: (data) => ({
      line: data.map(d => ({ time: d.time, value: (d.open + d.high + d.low + d.close) / 4 })),
    }),
  },
  {
    id: 'median_price', name: 'Median Price', shortName: 'MedPrice',
    category: 'Moving Averages', overlay: true,
    params: [],
    lines: [{ key: 'line', label: 'MedPrice', color: '#795548', width: 1, style: 'solid', visible: true }],
    calculate: (data) => ({
      line: data.map(d => ({ time: d.time, value: (d.high + d.low) / 2 })),
    }),
  },
  {
    id: 'typical_price', name: 'Typical Price', shortName: 'TypPrice',
    category: 'Moving Averages', overlay: true,
    params: [],
    lines: [{ key: 'line', label: 'TypPrice', color: '#9e9e9e', width: 1, style: 'solid', visible: true }],
    calculate: (data) => ({
      line: data.map(d => ({ time: d.time, value: (d.high + d.low + d.close) / 3 })),
    }),
  },
  {
    id: 'eom', name: 'Ease of Movement', shortName: 'EoM',
    category: 'Volume', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [{ key: 'eom', label: 'EoM', color: '#009688', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const raw = data.map((d, i) => {
        if (i === 0 || d.high === d.low) return 0;
        const dm = ((d.high + d.low) / 2) - ((data[i - 1].high + data[i - 1].low) / 2);
        const br = (d.volume / 10000) / (d.high - d.low);
        return dm / br;
      });
      const smoothed = sma(raw, params.period);
      return { eom: toPoints(data, smoothed) };
    },
  },
  {
    id: 'pvt', name: 'Price Volume Trend', shortName: 'PVT',
    category: 'Volume', overlay: false,
    params: [],
    lines: [{ key: 'pvt', label: 'PVT', color: '#3f51b5', width: 1, style: 'solid', visible: true }],
    calculate: (data) => {
      let pvt = 0;
      const pts: Point[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i > 0 && data[i - 1].close !== 0) {
          pvt += ((data[i].close - data[i - 1].close) / data[i - 1].close) * data[i].volume;
        }
        pts.push({ time: data[i].time, value: pvt });
      }
      return { pvt: pts };
    },
  },
  {
    id: 'chande_kroll', name: 'Chande Kroll Stop', shortName: 'CKS',
    category: 'Trend', overlay: true,
    params: [
      { key: 'p', label: 'Period', type: 'number', default: 10, min: 1, max: 50 },
      { key: 'q', label: 'Period', type: 'number', default: 9, min: 1, max: 50 },
      { key: 'x', label: 'Multiplier', type: 'number', default: 1, min: 0.1, max: 10, step: 0.1 },
    ],
    lines: [
      { key: 'stopLong', label: 'Stop Long', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'stopShort', label: 'Stop Short', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const tr = trueRange(data);
      const atrV = rma(tr, params.p);
      const firstStop = data.map((d, i) => atrV[i] !== null ? d.high - params.x * atrV[i]! : null);
      const secondStop = data.map((d, i) => atrV[i] !== null ? d.low + params.x * atrV[i]! : null);
      const stopLong = highest(firstStop.map(v => v ?? 0), params.q);
      const stopShort = lowest(secondStop.map(v => v ?? Infinity), params.q);
      return { stopLong: toPoints(data, stopLong), stopShort: toPoints(data, stopShort) };
    },
  },
  {
    id: 'linreg_slope', name: 'Linear Regression Slope', shortName: 'LinRegSlope',
    category: 'Momentum', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 20, min: 1, max: 200 }, SOURCE_PARAM],
    lines: [{ key: 'slope', label: 'Slope', color: '#2196f3', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source));
      const r: (number | null)[] = [];
      for (let i = 0; i < src.length; i++) {
        if (i < params.period - 1) { r.push(null); continue; }
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let j = 0; j < params.period; j++) {
          sumX += j; sumY += src[i - params.period + 1 + j];
          sumXY += j * src[i - params.period + 1 + j]; sumX2 += j * j;
        }
        r.push((params.period * sumXY - sumX * sumY) / (params.period * sumX2 - sumX * sumX));
      }
      return { slope: toPoints(data, r) };
    },
  },
  {
    id: 'accel_osc', name: 'Accelerator Oscillator', shortName: 'AC',
    category: 'Oscillators', overlay: false,
    params: [
      { key: 'fast', label: 'Fast', type: 'number', default: 5, min: 1, max: 50 },
      { key: 'slow', label: 'Slow', type: 'number', default: 34, min: 1, max: 200 },
    ],
    lines: [{ key: 'ac', label: 'AC', color: '#26a69a', width: 1, style: 'solid', visible: true, isHistogram: true }],
    calculate: (data, params) => {
      const hl2 = data.map(d => (d.high + d.low) / 2);
      const fast = sma(hl2, params.fast);
      const slow = sma(hl2, params.slow);
      const ao = hl2.map((_, i) => fast[i] !== null && slow[i] !== null ? fast[i]! - slow[i]! : 0);
      const aoSma = sma(ao, params.fast);
      const ac = ao.map((v, i) => aoSma[i] !== null ? v - aoSma[i]! : null);
      return { ac: toPoints(data, ac) };
    },
  },
  {
    id: 'asi', name: 'Accumulative Swing Index', shortName: 'ASI',
    category: 'Momentum', overlay: false,
    params: [{ key: 'limit', label: 'Limit Move', type: 'number', default: 10000, min: 1, max: 100000 }],
    lines: [{ key: 'asi', label: 'ASI', color: '#ff9800', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      let cumSI = 0;
      const pts: Point[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i === 0) { pts.push({ time: data[i].time, value: 0 }); continue; }
        const c = data[i].close, pc = data[i - 1].close;
        const o = data[i].open, po = data[i - 1].open;
        const h = data[i].high, l = data[i].low;
        const k = Math.max(Math.abs(h - pc), Math.abs(l - pc));
        const tr = Math.max(Math.abs(h - pc), Math.abs(l - pc), Math.abs(h - l));
        if (tr === 0) { pts.push({ time: data[i].time, value: cumSI }); continue; }
        const si = 50 * ((c - pc) + 0.5 * (c - o) + 0.25 * (pc - po)) / params.limit * (k / tr);
        cumSI += si;
        pts.push({ time: data[i].time, value: cumSI });
      }
      return { asi: pts };
    },
  },
  {
    id: 'dm', name: 'Directional Movement', shortName: 'DM',
    category: 'Trend', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 14, min: 1, max: 100 }],
    lines: [
      { key: 'plus', label: '+DM', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'minus', label: '-DM', color: '#ef5350', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const pdm: number[] = [0], ndm: number[] = [0];
      for (let i = 1; i < data.length; i++) {
        const up = data[i].high - data[i - 1].high;
        const down = data[i - 1].low - data[i].low;
        pdm.push(up > down && up > 0 ? up : 0);
        ndm.push(down > up && down > 0 ? down : 0);
      }
      return { plus: toPoints(data, rma(pdm, params.period)), minus: toPoints(data, rma(ndm, params.period)) };
    },
  },
  {
    id: 'relvol', name: 'Relative Volatility Index', shortName: 'RVlI',
    category: 'Volatility', overlay: false,
    params: [{ key: 'period', label: 'Length', type: 'number', default: 10, min: 1, max: 100 }],
    lines: [{ key: 'rvi', label: 'RVI', color: '#9c27b0', width: 1, style: 'solid', visible: true }],
    calculate: (data, params) => {
      const sd = stdev(data.map(d => d.close), params.period);
      const changes = sd.map((v, i) => {
        if (v === null || i === 0) return 0;
        return data[i].close > data[i - 1].close ? v : 0;
      });
      const lossChanges = sd.map((v, i) => {
        if (v === null || i === 0) return 0;
        return data[i].close <= data[i - 1].close ? v : 0;
      });
      const avgUp = rma(changes, 14);
      const avgDown = rma(lossChanges, 14);
      const r = changes.map((_, i) => {
        if (avgUp[i] === null || avgDown[i] === null) return null;
        const denom = avgUp[i]! + avgDown[i]!;
        return denom !== 0 ? 100 * avgUp[i]! / denom : 50;
      });
      return { rvi: toPoints(data, r) };
    },
  },
  {
    id: 'guppy', name: 'Guppy Multiple Moving Average', shortName: 'GMMA',
    category: 'Moving Averages', overlay: true,
    params: [SOURCE_PARAM],
    lines: [
      { key: 'e3', label: 'EMA 3', color: '#4caf50', width: 1, style: 'solid', visible: true },
      { key: 'e5', label: 'EMA 5', color: '#66bb6a', width: 1, style: 'solid', visible: true },
      { key: 'e8', label: 'EMA 8', color: '#81c784', width: 1, style: 'solid', visible: true },
      { key: 'e10', label: 'EMA 10', color: '#a5d6a7', width: 1, style: 'solid', visible: true },
      { key: 'e12', label: 'EMA 12', color: '#c8e6c9', width: 1, style: 'solid', visible: true },
      { key: 'e15', label: 'EMA 15', color: '#e8f5e9', width: 1, style: 'solid', visible: true },
      { key: 'e30', label: 'EMA 30', color: '#ef5350', width: 1, style: 'solid', visible: true },
      { key: 'e35', label: 'EMA 35', color: '#e53935', width: 1, style: 'solid', visible: true },
      { key: 'e40', label: 'EMA 40', color: '#c62828', width: 1, style: 'solid', visible: true },
      { key: 'e45', label: 'EMA 45', color: '#b71c1c', width: 1, style: 'solid', visible: true },
      { key: 'e50', label: 'EMA 50', color: '#d50000', width: 1, style: 'solid', visible: true },
      { key: 'e60', label: 'EMA 60', color: '#ff1744', width: 1, style: 'solid', visible: true },
    ],
    calculate: (data, params) => {
      const src = data.map(d => getSource(d, params.source || 'close'));
      const periods = [3, 5, 8, 10, 12, 15, 30, 35, 40, 45, 50, 60];
      const keys = ['e3', 'e5', 'e8', 'e10', 'e12', 'e15', 'e30', 'e35', 'e40', 'e45', 'e50', 'e60'];
      const result: Record<string, Point[]> = {};
      for (let i = 0; i < periods.length; i++) {
        result[keys[i]] = toPoints(data, ema(src, periods[i]));
      }
      return result;
    },
  },
];

// ═══════════════════════════════════════════
// REGISTRY API
// ═══════════════════════════════════════════

const indicatorMap = new Map<string, IndicatorDefinition>();
for (const ind of INDICATORS) indicatorMap.set(ind.id, ind);

export function getIndicator(id: string): IndicatorDefinition | undefined {
  return indicatorMap.get(id);
}

export function getAllIndicators(): IndicatorDefinition[] {
  return INDICATORS;
}

export function getIndicatorsByCategory(): Map<string, IndicatorDefinition[]> {
  const map = new Map<string, IndicatorDefinition[]>();
  for (const ind of INDICATORS) {
    const list = map.get(ind.category) || [];
    list.push(ind);
    map.set(ind.category, list);
  }
  return map;
}

export function getCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const ind of INDICATORS) {
    if (!seen.has(ind.category)) { seen.add(ind.category); result.push(ind.category); }
  }
  return result;
}
