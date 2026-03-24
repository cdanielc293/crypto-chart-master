import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crosshair, MousePointer2, CircleDot, ArrowUpRight,
  TrendingUp, MoveRight, Info, ArrowRight, Triangle as TriangleIcon,
  Minus, ArrowRightFromLine, ArrowDownUp, X,
  Columns3, TrendingDown,
  GitBranch, GitFork,
  Spline, Fan, Waves, Circle, Disc, Compass, Slice, Wind,
  Grid3X3, LayoutGrid, Square, BarChart2,
  Network, Fingerprint, Crown, Diamond, Hexagon,
  BarChart, Timer, Activity,
  ArrowUpFromLine, ArrowDownFromLine, Waypoints, Ghost, Radar, BarChart3,
  Ruler, Calendar, CalendarRange,
  Brush, Highlighter,
  Flag, Pencil, ArrowUp, ArrowDown,
  RectangleHorizontal, RotateCw, Route, CircleIcon, Move3D, Pentagon,
  Undo2, Infinity,
  Type, Smile, MessageSquare,
  ZoomIn, Magnet, Lock, Eye, Trash2,
  Star, ChevronRight,
} from 'lucide-react';

export type NewUIDrawingTool =
  | 'none' | 'cursor' | 'dot' | 'arrow_cursor'
  | 'trendline' | 'ray' | 'infoline' | 'extendedline' | 'trendangle'
  | 'horizontalline' | 'horizontalray' | 'verticalline' | 'crossline'
  | 'parallelchannel' | 'regressiontrend'
  | 'pitchfork' | 'schiffpitchfork' | 'modifiedschiff' | 'insidepitchfork'
  | 'fibonacci' | 'fibextension' | 'fibchannel' | 'pitchfan'
  | 'gannbox' | 'gannfan'
  | 'xabcd' | 'cypher' | 'headshoulders' | 'abcd' | 'trianglepattern' | 'threedrives'
  | 'longposition' | 'shortposition'
  | 'pricerange' | 'daterange' | 'datepricerange'
  | 'anchoredvwap' | 'fixedrangevolume'
  | 'text' | 'note'
  | 'emoji'
  | 'brush' | 'highlighter'
  | 'arrowmarker' | 'arrowdraw' | 'arrowmarkup' | 'arrowmarkdown'
  | 'rectangle' | 'rotatedrectangle' | 'path' | 'circle' | 'ellipse'
  | 'polyline' | 'triangle' | 'arc' | 'curve';

interface ToolItem {
  tool: NewUIDrawingTool;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
}

interface ToolGroup {
  label: string;
  items: ToolItem[];
}

interface ToolCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
  groups: ToolGroup[];
}

const S = 16;

const categories: ToolCategory[] = [
  {
    id: 'cursor',
    icon: <Crosshair size={S} />,
    label: 'Cursor tools',
    groups: [{
      label: '',
      items: [
        { tool: 'cursor', label: 'Cross', icon: <Crosshair size={S} /> },
        { tool: 'dot', label: 'Dot', icon: <CircleDot size={S} /> },
        { tool: 'arrow_cursor', label: 'Arrow', icon: <ArrowUpRight size={S} /> },
      ],
    }],
  },
  {
    id: 'lines',
    icon: <TrendingUp size={S} />,
    label: 'Lines & Channels',
    groups: [
      {
        label: 'LINES',
        items: [
          { tool: 'trendline', label: 'Trendline', icon: <TrendingUp size={S} />, shortcut: 'Alt+T' },
          { tool: 'ray', label: 'Ray', icon: <MoveRight size={S} /> },
          { tool: 'infoline', label: 'Info line', icon: <Info size={S} /> },
          { tool: 'extendedline', label: 'Extended line', icon: <ArrowRight size={S} /> },
          { tool: 'trendangle', label: 'Trend angle', icon: <TriangleIcon size={S} /> },
          { tool: 'horizontalline', label: 'Horizontal line', icon: <Minus size={S} />, shortcut: 'Alt+H' },
          { tool: 'horizontalray', label: 'Horizontal ray', icon: <ArrowRightFromLine size={S} /> },
          { tool: 'verticalline', label: 'Vertical line', icon: <ArrowDownUp size={S} /> },
          { tool: 'crossline', label: 'Cross line', icon: <X size={S} /> },
        ],
      },
      {
        label: 'CHANNELS',
        items: [
          { tool: 'parallelchannel', label: 'Parallel channel', icon: <Columns3 size={S} /> },
          { tool: 'regressiontrend', label: 'Regression trend', icon: <TrendingDown size={S} /> },
        ],
      },
      {
        label: 'PITCHFORKS',
        items: [
          { tool: 'pitchfork', label: 'Pitchfork', icon: <GitFork size={S} /> },
          { tool: 'schiffpitchfork', label: 'Schiff pitchfork', icon: <GitFork size={S} /> },
          { tool: 'modifiedschiff', label: 'Modified Schiff', icon: <GitFork size={S} /> },
          { tool: 'insidepitchfork', label: 'Inside pitchfork', icon: <GitFork size={S} /> },
        ],
      },
    ],
  },
  {
    id: 'fibonacci',
    icon: <GitBranch size={S} />,
    label: 'Fibonacci & Gann',
    groups: [
      {
        label: 'FIBONACCI',
        items: [
          { tool: 'fibonacci', label: 'Fib retracement', icon: <GitBranch size={S} />, shortcut: 'Alt+F' },
          { tool: 'fibextension', label: 'Fib extension', icon: <Spline size={S} /> },
          { tool: 'fibchannel', label: 'Fib channel', icon: <Columns3 size={S} /> },
          { tool: 'pitchfan', label: 'Pitchfan', icon: <Wind size={S} /> },
        ],
      },
      {
        label: 'GANN',
        items: [
          { tool: 'gannbox', label: 'Gann box', icon: <Grid3X3 size={S} /> },
          { tool: 'gannfan', label: 'Gann fan', icon: <BarChart2 size={S} /> },
        ],
      },
    ],
  },
  {
    id: 'patterns',
    icon: <Network size={S} />,
    label: 'Patterns',
    groups: [{
      label: 'CHART PATTERNS',
      items: [
        { tool: 'xabcd', label: 'XABCD pattern', icon: <Network size={S} /> },
        { tool: 'cypher', label: 'Cypher pattern', icon: <Fingerprint size={S} /> },
        { tool: 'headshoulders', label: 'Head and shoulders', icon: <Crown size={S} /> },
        { tool: 'abcd', label: 'ABCD pattern', icon: <Diamond size={S} /> },
        { tool: 'trianglepattern', label: 'Triangle pattern', icon: <TriangleIcon size={S} /> },
        { tool: 'threedrives', label: 'Three drives', icon: <Hexagon size={S} /> },
      ],
    }],
  },
  {
    id: 'forecasting',
    icon: <Ruler size={S} />,
    label: 'Forecasting & Measurers',
    groups: [
      {
        label: 'FORECASTING',
        items: [
          { tool: 'longposition', label: 'Long position', icon: <ArrowUpFromLine size={S} /> },
          { tool: 'shortposition', label: 'Short position', icon: <ArrowDownFromLine size={S} /> },
        ],
      },
      {
        label: 'VOLUME',
        items: [
          { tool: 'anchoredvwap', label: 'Anchored VWAP', icon: <Radar size={S} /> },
          { tool: 'fixedrangevolume', label: 'Fixed range volume', icon: <BarChart3 size={S} /> },
        ],
      },
      {
        label: 'MEASURERS',
        items: [
          { tool: 'pricerange', label: 'Price range', icon: <Ruler size={S} /> },
          { tool: 'daterange', label: 'Date range', icon: <Calendar size={S} /> },
          { tool: 'datepricerange', label: 'Date & price range', icon: <CalendarRange size={S} /> },
        ],
      },
    ],
  },
  {
    id: 'text',
    icon: <Type size={S} />,
    label: 'Text & Notes',
    groups: [{
      label: '',
      items: [
        { tool: 'text', label: 'Text', icon: <Type size={S} /> },
        { tool: 'note', label: 'Note', icon: <MessageSquare size={S} /> },
      ],
    }],
  },
  {
    id: 'shapes',
    icon: <Brush size={S} />,
    label: 'Brushes & Shapes',
    groups: [
      {
        label: 'BRUSHES',
        items: [
          { tool: 'brush', label: 'Brush', icon: <Brush size={S} /> },
          { tool: 'highlighter', label: 'Highlighter', icon: <Highlighter size={S} /> },
        ],
      },
      {
        label: 'ARROWS',
        items: [
          { tool: 'arrowmarker', label: 'Arrow marker', icon: <Flag size={S} /> },
          { tool: 'arrowdraw', label: 'Arrow', icon: <Pencil size={S} /> },
          { tool: 'arrowmarkup', label: 'Arrow up', icon: <ArrowUp size={S} /> },
          { tool: 'arrowmarkdown', label: 'Arrow down', icon: <ArrowDown size={S} /> },
        ],
      },
      {
        label: 'SHAPES',
        items: [
          { tool: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal size={S} /> },
          { tool: 'rotatedrectangle', label: 'Rotated rectangle', icon: <RotateCw size={S} /> },
          { tool: 'path', label: 'Path', icon: <Route size={S} /> },
          { tool: 'circle', label: 'Circle', icon: <CircleIcon size={S} /> },
          { tool: 'ellipse', label: 'Ellipse', icon: <Move3D size={S} /> },
          { tool: 'polyline', label: 'Polyline', icon: <Pentagon size={S} /> },
          { tool: 'triangle', label: 'Triangle', icon: <TriangleIcon size={S} /> },
          { tool: 'arc', label: 'Arc', icon: <Undo2 size={S} /> },
          { tool: 'curve', label: 'Curve', icon: <Spline size={S} /> },
        ],
      },
    ],
  },
];

interface Props {
  activeTool: NewUIDrawingTool;
  onSelectTool: (tool: NewUIDrawingTool) => void;
  drawingsCount: number;
  onDeleteAll: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function NewUILeftToolbar({ activeTool, onSelectTool, drawingsCount, onDeleteAll, onUndo, onRedo, canUndo, canRedo }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedPerCategory, setSelectedPerCategory] = useState<Record<string, NewUIDrawingTool>>({
    cursor: 'cursor',
    lines: 'trendline',
    fibonacci: 'fibonacci',
    patterns: 'xabcd',
    forecasting: 'longposition',
    text: 'text',
    shapes: 'brush',
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isToolInCategory = (categoryId: string) => {
    if (activeTool === 'none') return false;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.groups.some(g => g.items.some(t => t.tool === activeTool)) ?? false;
  };

  const getCategoryIcon = (cat: ToolCategory) => {
    const selected = selectedPerCategory[cat.id];
    if (selected) {
      for (const g of cat.groups) {
        const item = g.items.find(i => i.tool === selected);
        if (item) return item.icon;
      }
    }
    return cat.icon;
  };

  const handleToolSelect = (categoryId: string, tool: NewUIDrawingTool) => {
    onSelectTool(tool);
    setSelectedPerCategory(prev => ({ ...prev, [categoryId]: tool }));
    setOpenCategory(null);
  };

  return (
    <div
      ref={menuRef}
      className="flex flex-col items-center w-11 bg-[#0d1520] border-r border-white/[0.06] py-1 gap-0.5 select-none z-30 flex-shrink-0"
    >
      {categories.map(cat => (
        <div key={cat.id} className="relative">
          <button
            onClick={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
            onDoubleClick={() => {
              const tool = selectedPerCategory[cat.id] || cat.groups[0]?.items[0]?.tool;
              if (tool) onSelectTool(tool);
            }}
            title={cat.label}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative ${
              isToolInCategory(cat.id)
                ? 'bg-white/10 text-white'
                : openCategory === cat.id
                  ? 'bg-white/[0.06] text-white/70'
                  : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
            }`}
          >
            {getCategoryIcon(cat)}
            <span className="absolute bottom-0.5 right-0.5 border-l-[3px] border-b-[3px] border-l-transparent border-b-white/20 w-0 h-0" />
          </button>

          {openCategory === cat.id && (
            <div className="absolute left-full top-0 ml-1 bg-[#0a1628]/95 backdrop-blur-md border border-white/[0.08] rounded-md shadow-2xl py-1 min-w-[240px] max-h-[75vh] overflow-y-auto z-50">
              {cat.groups.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 tracking-wider">
                      {group.label}
                    </div>
                  )}
                  {gi > 0 && cat.groups[gi - 1].label && (
                    <div className="h-px bg-white/[0.06] my-0.5" />
                  )}
                  {group.items.map(item => (
                    <button
                      key={`${cat.id}-${item.tool}-${item.label}`}
                      onClick={() => handleToolSelect(cat.id, item.tool)}
                      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-white/[0.06] transition-colors group ${
                        activeTool === item.tool ? 'text-cyan-400' : 'text-white/70'
                      }`}
                    >
                      <span className="text-white/30 group-hover:text-white/60 w-5 flex-shrink-0 flex justify-center">
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-white/20 ml-2">{item.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="w-6 h-px bg-white/[0.06] my-1" />

      <button
        onClick={() => onSelectTool('none')}
        title="Cursor (no drawing)"
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
          activeTool === 'none' ? 'bg-white/10 text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
        }`}
      >
        <MousePointer2 size={S} />
      </button>

      <div className="flex-1" />

      {drawingsCount > 0 && (
        <button
          onClick={onDeleteAll}
          title={`Remove all drawings (${drawingsCount})`}
          className="w-9 h-9 flex items-center justify-center rounded text-white/30 hover:bg-white/[0.04] hover:text-red-400 transition-colors"
        >
          <Trash2 size={S} />
        </button>
      )}
    </div>
  );
}
