import type { DrawingTool } from '@/types/chart';

export interface ToolItem {
  tool: DrawingTool;
  label: string;
  iconName: string;
  shortcut?: string;
  defaultStarred?: boolean;
  emoji?: string; // for emoji tools
}

export interface ToolGroup {
  label: string;
  items: ToolItem[];
}

export interface ToolCategory {
  id: string;
  iconName: string;
  label: string;
  groups: ToolGroup[];
}

export const categories: ToolCategory[] = [
  {
    id: 'cursor',
    iconName: 'Crosshair',
    label: 'Cursor tools',
    groups: [{
      label: '',
      items: [
        { tool: 'cursor', label: 'Cross', iconName: 'Crosshair', defaultStarred: true },
        { tool: 'dot', label: 'Dot', iconName: 'CircleDot' },
        { tool: 'arrow_cursor', label: 'Arrow', iconName: 'ArrowUpRight' },
      ],
    }],
  },
  {
    id: 'lines',
    iconName: 'TrendingUp',
    label: 'Lines & Channels',
    groups: [
      {
        label: 'LINES',
        items: [
          { tool: 'trendline', label: 'Trendline', iconName: 'TrendingUp', shortcut: 'Alt + T', defaultStarred: true },
          { tool: 'ray', label: 'Ray', iconName: 'MoveRight' },
          { tool: 'infoline', label: 'Info line', iconName: 'Info' },
          { tool: 'extendedline', label: 'Extended line', iconName: 'ArrowRight' },
          { tool: 'trendangle', label: 'Trend angle', iconName: 'Triangle' },
          { tool: 'horizontalline', label: 'Horizontal line', iconName: 'Minus', shortcut: 'Alt + H' },
          { tool: 'horizontalray', label: 'Horizontal ray', iconName: 'ArrowRightFromLine', shortcut: 'Alt + J' },
          { tool: 'verticalline', label: 'Vertical line', iconName: 'ArrowDownUp', shortcut: 'Alt + V' },
          { tool: 'crossline', label: 'Cross line', iconName: 'X', shortcut: 'Alt + C' },
        ],
      },
      {
        label: 'CHANNELS',
        items: [
          { tool: 'parallelchannel', label: 'Parallel channel', iconName: 'Columns3' },
          { tool: 'regressiontrend', label: 'Regression trend', iconName: 'TrendingDown' },
          { tool: 'flattopbottom', label: 'Flat top/bottom', iconName: 'AlignHorizontalSpaceAround' },
          { tool: 'disjointchannel', label: 'Disjoint channel', iconName: 'SplitSquareHorizontal' },
        ],
      },
      {
        label: 'PITCHFORKS',
        items: [
          { tool: 'pitchfork', label: 'Pitchfork', iconName: 'GitFork' },
          { tool: 'schiffpitchfork', label: 'Schiff pitchfork', iconName: 'GitFork' },
          { tool: 'modifiedschiff', label: 'Modified Schiff pitchfork', iconName: 'GitFork' },
          { tool: 'insidepitchfork', label: 'Inside pitchfork', iconName: 'GitFork' },
        ],
      },
    ],
  },
  {
    id: 'fibonacci',
    iconName: 'GitBranch',
    label: 'Fibonacci & Gann',
    groups: [
      {
        label: 'FIBONACCI',
        items: [
          { tool: 'fibonacci', label: 'Fib retracement', iconName: 'GitBranch', shortcut: 'Alt + F', defaultStarred: true },
          { tool: 'fibextension', label: 'Trend-based fib extension', iconName: 'Spline' },
          { tool: 'fibchannel', label: 'Fib channel', iconName: 'Columns3' },
          { tool: 'fibtimezone', label: 'Fib time zone', iconName: 'Timer' },
          { tool: 'fibspeedresistance', label: 'Fib speed resistance fan', iconName: 'Fan' },
          { tool: 'fibtrendtime', label: 'Trend-based fib time', iconName: 'Waves' },
          { tool: 'fibcircles', label: 'Fib circles', iconName: 'Circle' },
          { tool: 'fibspiral', label: 'Fib spiral', iconName: 'Disc' },
          { tool: 'fibspeedarcs', label: 'Fib speed resistance arcs', iconName: 'Compass' },
          { tool: 'fibwedge', label: 'Fib wedge', iconName: 'Slice' },
          { tool: 'pitchfan', label: 'Pitchfan', iconName: 'Wind' },
        ],
      },
      {
        label: 'GANN',
        items: [
          { tool: 'gannbox', label: 'Gann box', iconName: 'Grid3X3' },
          { tool: 'gannsquarefixed', label: 'Gann square fixed', iconName: 'LayoutGrid' },
          { tool: 'gannsquare', label: 'Gann square', iconName: 'Square' },
          { tool: 'gannfan', label: 'Gann fan', iconName: 'BarChart2' },
        ],
      },
    ],
  },
  {
    id: 'forecasting',
    iconName: 'Target',
    label: 'Forecasting & Volume',
    groups: [
      {
        label: 'FORECASTING',
        items: [
          { tool: 'longposition', label: 'Long position', iconName: 'ArrowUpFromLine', defaultStarred: true },
          { tool: 'shortposition', label: 'Short position', iconName: 'ArrowDownFromLine', defaultStarred: true },
          { tool: 'positionforecast', label: 'Position forecast', iconName: 'Waypoints' },
          { tool: 'barpattern', label: 'Bar pattern', iconName: 'BarChart' },
          { tool: 'ghostfeed', label: 'Ghost feed', iconName: 'Ghost' },
          { tool: 'sector', label: 'Sector', iconName: 'PieChart' },
        ],
      },
      {
        label: 'MEASURERS',
        items: [
          { tool: 'datepricerange', label: 'Date and price range', iconName: 'CalendarRange', defaultStarred: true },
        ],
      },
    ],
  },
  {
    id: 'shapes',
    iconName: 'Brush',
    label: 'Brushes & Shapes',
    groups: [
      {
        label: 'BRUSHES',
        items: [
          { tool: 'brush', label: 'Brush', iconName: 'Brush', defaultStarred: true },
        ],
      },
      {
        label: 'SHAPES',
        items: [
          { tool: 'rectangle', label: 'Rectangle', iconName: 'RectangleHorizontal', shortcut: 'Alt + Shift + R', defaultStarred: true },
        ],
      },
    ],
  },
];

// Helper to get all items flat
export function getAllToolItems(): ToolItem[] {
  const items: ToolItem[] = [];
  for (const cat of categories) {
    for (const group of cat.groups) {
      for (const item of group.items) {
        items.push(item);
      }
    }
  }
  return items;
}

// Starred tools management
const STARRED_KEY = 'vizionx-starred-tools';

export function getStarredTools(): Set<string> {
  try {
    const stored = localStorage.getItem(STARRED_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  // Default starred
  const defaults = new Set<string>();
  for (const item of getAllToolItems()) {
    if (item.defaultStarred) defaults.add(item.tool);
  }
  return defaults;
}

export function setStarredTools(tools: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...tools]));
}

export function toggleStarredTool(tool: string): Set<string> {
  const current = getStarredTools();
  if (current.has(tool)) current.delete(tool);
  else current.add(tool);
  setStarredTools(current);
  return current;
}

// Favorites bar position
const FAV_POS_KEY = 'vizionx-favorites-bar-pos';

export function getFavoritesBarPosition(): { x: number; y: number } {
  try {
    const stored = localStorage.getItem(FAV_POS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { x: 60, y: 100 };
}

export function saveFavoritesBarPosition(pos: { x: number; y: number }) {
  localStorage.setItem(FAV_POS_KEY, JSON.stringify(pos));
}
