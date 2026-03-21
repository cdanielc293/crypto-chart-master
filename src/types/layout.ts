export interface LayoutSyncOptions {
  symbol: boolean;
  interval: boolean;
  crosshair: boolean;
  time: boolean;
  dateRange: boolean;
}

export const DEFAULT_SYNC_OPTIONS: LayoutSyncOptions = {
  symbol: false,
  interval: false,
  crosshair: true,
  time: false,
  dateRange: false,
};

/** Each cell: column start, row start (0-based), column span, row span */
export interface GridCell { c: number; r: number; w: number; h: number; }

export interface GridLayout {
  id: string;
  count: number;
  cols: number;
  rows: number;
  cells: GridCell[];
}

// Helper
function g(id: string, count: number, cols: number, rows: number, cells: GridCell[]): GridLayout {
  return { id, count, cols, rows, cells };
}

export const ALL_GRID_LAYOUTS: GridLayout[] = [
  // ── 1 ──
  g('1', 1, 1, 1, [{ c:0,r:0,w:1,h:1 }]),

  // ── 2 ──
  g('2a', 2, 2, 1, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 }]),
  g('2b', 2, 1, 2, [{ c:0,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 }]),

  // ── 3 ──
  g('3a', 3, 3, 1, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:2,r:0,w:1,h:1 }]),
  g('3b', 3, 2, 2, [{ c:0,r:0,w:1,h:2 },{ c:1,r:0,w:1,h:1 },{ c:1,r:1,w:1,h:1 }]),
  g('3c', 3, 2, 2, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:2 },{ c:0,r:1,w:1,h:1 }]),
  g('3d', 3, 2, 2, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:0,r:1,w:2,h:1 }]),
  g('3e', 3, 2, 2, [{ c:0,r:0,w:2,h:1 },{ c:0,r:1,w:1,h:1 },{ c:1,r:1,w:1,h:1 }]),
  g('3f', 3, 1, 3, [{ c:0,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 },{ c:0,r:2,w:1,h:1 }]),

  // ── 4 ──
  g('4a', 4, 2, 2, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 },{ c:1,r:1,w:1,h:1 }]),
  g('4b', 4, 2, 3, [{ c:0,r:0,w:1,h:3 },{ c:1,r:0,w:1,h:1 },{ c:1,r:1,w:1,h:1 },{ c:1,r:2,w:1,h:1 }]),
  g('4c', 4, 3, 1, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:2,r:0,w:1,h:1 }].concat([{ c:0,r:0,w:0,h:0 }]).slice(0,3).concat([{ c:0,r:0,w:1,h:1 }]),// bad, redo
  // Let me just be precise:
  g('4c', 4, 4, 1, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:2,r:0,w:1,h:1 },{ c:3,r:0,w:1,h:1 }]),
  g('4d', 4, 3, 2, [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:2,h:2 },{ c:0,r:1,w:1,h:1 }].concat([{c:0,r:0,w:1,h:1}]).slice(0,4)),
];
// This approach is getting messy. Let me write a clean version.
