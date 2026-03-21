import type { LayoutSyncOptions } from '@/types/layout';

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

// Each cell in a grid layout: position + span in a base grid
export interface GridCell {
  c: number; // column start (0-based)
  r: number; // row start (0-based)
  w: number; // column span
  h: number; // row span
}

export interface GridLayout {
  id: string;
  count: number;    // number of charts
  cols: number;      // base grid columns
  rows: number;      // base grid rows
  cells: GridCell[];
}

// All layout options matching TradingView reference
export const ALL_GRID_LAYOUTS: GridLayout[] = [
  // === 1 chart ===
  { id: '1', count: 1, cols: 1, rows: 1, cells: [{ c:0, r:0, w:1, h:1 }] },

  // === 2 charts ===
  { id: '2h', count: 2, cols: 2, rows: 1, cells: [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 }] },
  { id: '2v', count: 2, cols: 1, rows: 2, cells: [{ c:0,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 }] },

  // === 3 charts ===
  { id: '3a', count: 3, cols: 3, rows: 1, cells: [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:2,r:0,w:1,h:1 }] },
  { id: '3b', count: 3, cols: 2, rows: 2, cells: [{ c:0,r:0,w:1,h:2 },{ c:1,r:0,w:1,h:1 },{ c:1,r:1,w:1,h:1 }] },
  { id: '3c', count: 3, cols: 2, rows: 2, cells: [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:2 },{ c:0,r:1,w:1,h:1 }] },
  { id: '3d', count: 3, cols: 2, rows: 2, cells: [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:0,r:1,w:2,h:1 }] },
  { id: '3e', count: 3, cols: 2, rows: 2, cells: [{ c:0,r:0,w:2,h:1 },{ c:0,r:1,w:1,h:1 },{ c:1,r:1,w:1,h:1 }] },
  { id: '3f', count: 3, cols: 1, rows: 3, cells: [{ c:0,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 },{ c:0,r:2,w:1,h:1 }] },

  // === 4 charts ===
  { id: '4a', count: 4, cols: 2, rows: 2, cells: [{ c:0,r:0,w:1,h:1 },{ c:1,r:0,w:1,h:1 },{ c:0,r:1,w:1,h:1 },{ c:1,r:1,w:1,h:1 }] },
  { id: '4b', count: 4, cols: 3, rows: 2, cells: [{ c:0,r:0,w:2,h:2 },{ c:2,r:0,w:1,h:1 },{ c:2,r:1,w:1,h:1 },{ c:0,r:0,w:0,h:0 }] }, // wrong, redo
  // Actually: 1 big left (2cols, 2rows) + 2 small right
  // But that's only 3. Let me think about 4-chart layouts from the image...
  // Row 4 in image: 2x2, 1bigLeft+3stackedRight, 1bigLeft+1top+2bottom, 3cols+1bigBottom, lots of variations
  
  // Let me redo row 4 properly:
  // 4a: 2x2 grid
  // 4b: 1 big left + 3 stacked right  
  // 4c: 1 big top-left + 1 top-right + 2 bottom
  // 4d: 3 cols top + 1 big bottom
  // 4e: 1 big top + 3 bottom
  // 4f: 1 big right + 3 stacked left
  // 4g: 2 left + 2 right (vertical pairs)
  // 4h: 4 rows
];

// I need to redo this properly. Let me redefine.
