import { useState, useRef, useEffect } from 'react';
import { useChart } from '@/context/ChartContext';
import type { DrawingTool } from '@/types/chart';
import {
  Crosshair, MousePointer2, CircleDot, ArrowUpRight, Presentation,
  TrendingUp, MoveRight, Info, ArrowRight, Triangle as TriangleIcon,
  Minus, ArrowRightFromLine, ArrowDownUp, X,
  Columns3, TrendingDown, AlignHorizontalSpaceAround, SplitSquareHorizontal,
  GitBranch, GitFork, ArrowDownToLine,
  BarChart3, Waves, Circle, Disc, Fan, Target, Compass, Spline, CircleDashed, Slice, Wind,
  Grid3X3, LayoutGrid, Square, BarChart2,
  Network, Fingerprint, Crown, Diamond, Hexagon, Shapes,
  Sigma, Omega, PenTool,
  BarChart, Timer, Activity,
  ArrowUpFromLine, ArrowDownFromLine, Waypoints, Ghost, Radar, PieChart,
  Ruler, Calendar, CalendarRange,
  Brush, Highlighter,
  Flag, Pencil, ArrowUp, ArrowDown,
  RectangleHorizontal, RotateCw, Route, CircleIcon, Move3D, Pentagon,
  TriangleRight, Undo2, Spline as CurveIcon, Infinity,
  Type, Smile,
  ZoomIn, Magnet, Lock, Eye, Link, Trash2,
  ChevronRight, Star,
} from 'lucide-react';

// ─── Tool category definitions ───

interface ToolItem {
  tool: DrawingTool;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  starred?: boolean;
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

const TOOL_SIZE = 17;

const categories: ToolCategory[] = [
  {
    id: 'cursor',
    icon: <Crosshair size={TOOL_SIZE} />,
    label: 'Cursor tools',
    groups: [{
      label: '',
      items: [
        { tool: 'cursor', label: 'Cross', icon: <Crosshair size={16} />, starred: true },
        { tool: 'dot', label: 'Dot', icon: <CircleDot size={16} /> },
        { tool: 'arrow_cursor', label: 'Arrow', icon: <ArrowUpRight size={16} /> },
        
      ],
    }],
  },
  {
    id: 'lines',
    icon: <TrendingUp size={TOOL_SIZE} />,
    label: 'Lines & Channels',
    groups: [
      {
        label: 'LINES',
        items: [
          { tool: 'trendline', label: 'Trendline', icon: <TrendingUp size={16} />, shortcut: 'Alt + T', starred: true },
          { tool: 'ray', label: 'Ray', icon: <MoveRight size={16} /> },
          { tool: 'infoline', label: 'Info line', icon: <Info size={16} /> },
          { tool: 'extendedline', label: 'Extended line', icon: <ArrowRight size={16} /> },
          { tool: 'trendangle', label: 'Trend angle', icon: <TriangleIcon size={16} /> },
          { tool: 'horizontalline', label: 'Horizontal line', icon: <Minus size={16} />, shortcut: 'Alt + H' },
          { tool: 'horizontalray', label: 'Horizontal ray', icon: <ArrowRightFromLine size={16} />, shortcut: 'Alt + J' },
          { tool: 'verticalline', label: 'Vertical line', icon: <ArrowDownUp size={16} />, shortcut: 'Alt + V' },
          { tool: 'crossline', label: 'Cross line', icon: <X size={16} />, shortcut: 'Alt + C' },
        ],
      },
      {
        label: 'CHANNELS',
        items: [
          { tool: 'parallelchannel', label: 'Parallel channel', icon: <Columns3 size={16} /> },
          { tool: 'regressiontrend', label: 'Regression trend', icon: <TrendingDown size={16} /> },
          { tool: 'flattopbottom', label: 'Flat top/bottom', icon: <AlignHorizontalSpaceAround size={16} /> },
          { tool: 'disjointchannel', label: 'Disjoint channel', icon: <SplitSquareHorizontal size={16} /> },
        ],
      },
      {
        label: 'PITCHFORKS',
        items: [
          { tool: 'pitchfork', label: 'Pitchfork', icon: <GitFork size={16} /> },
          { tool: 'schiffpitchfork', label: 'Schiff pitchfork', icon: <GitFork size={16} /> },
          { tool: 'modifiedschiff', label: 'Modified Schiff pitchfork', icon: <GitFork size={16} /> },
          { tool: 'insidepitchfork', label: 'Inside pitchfork', icon: <GitFork size={16} /> },
        ],
      },
    ],
  },
  {
    id: 'fibonacci',
    icon: <GitBranch size={TOOL_SIZE} />,
    label: 'Fibonacci & Gann',
    groups: [
      {
        label: 'FIBONACCI',
        items: [
          { tool: 'fibonacci', label: 'Fib retracement', icon: <GitBranch size={16} />, shortcut: 'Alt + F', starred: true },
          { tool: 'fibextension', label: 'Trend-based fib extension', icon: <Spline size={16} /> },
          { tool: 'fibchannel', label: 'Fib channel', icon: <Columns3 size={16} /> },
          { tool: 'fibtimezone', label: 'Fib time zone', icon: <Timer size={16} /> },
          { tool: 'fibspeedresistance', label: 'Fib speed resistance fan', icon: <Fan size={16} /> },
          { tool: 'fibtrendtime', label: 'Trend-based fib time', icon: <Waves size={16} /> },
          { tool: 'fibcircles', label: 'Fib circles', icon: <Circle size={16} /> },
          { tool: 'fibspiral', label: 'Fib spiral', icon: <Disc size={16} /> },
          { tool: 'fibspeedarcs', label: 'Fib speed resistance arcs', icon: <Compass size={16} /> },
          { tool: 'fibwedge', label: 'Fib wedge', icon: <Slice size={16} /> },
          { tool: 'pitchfan', label: 'Pitchfan', icon: <Wind size={16} /> },
        ],
      },
      {
        label: 'GANN',
        items: [
          { tool: 'gannbox', label: 'Gann box', icon: <Grid3X3 size={16} /> },
          { tool: 'gannsquarefixed', label: 'Gann square fixed', icon: <LayoutGrid size={16} /> },
          { tool: 'gannsquare', label: 'Gann square', icon: <Square size={16} /> },
          { tool: 'gannfan', label: 'Gann fan', icon: <BarChart2 size={16} /> },
        ],
      },
    ],
  },
  {
    id: 'patterns',
    icon: <Network size={TOOL_SIZE} />,
    label: 'Patterns & Waves',
    groups: [
      {
        label: 'CHART PATTERNS',
        items: [
          { tool: 'xabcd', label: 'XABCD pattern', icon: <Network size={16} /> },
          { tool: 'cypher', label: 'Cypher pattern', icon: <Fingerprint size={16} /> },
          { tool: 'headshoulders', label: 'Head and shoulders', icon: <Crown size={16} /> },
          { tool: 'abcd', label: 'ABCD pattern', icon: <Diamond size={16} /> },
          { tool: 'trianglepattern', label: 'Triangle pattern', icon: <TriangleIcon size={16} /> },
          { tool: 'threedrives', label: 'Three drives pattern', icon: <Hexagon size={16} /> },
        ],
      },
      {
        label: 'ELLIOTT WAVES',
        items: [
          { tool: 'elliottimpulse', label: 'Elliott impulse wave (1·2·3·4·5)', icon: <Waves size={16} /> },
          { tool: 'elliottcorrection', label: 'Elliott correction wave (A·B·C)', icon: <Waves size={16} /> },
          { tool: 'elliotttriangle', label: 'Elliott triangle wave (A·B·C·D·E)', icon: <Waves size={16} /> },
          { tool: 'elliottdouble', label: 'Elliott double combo wave (W·X·Y)', icon: <Waves size={16} /> },
          { tool: 'elliotttriple', label: 'Elliott triple combo wave (W·X·Y·X·Z)', icon: <Waves size={16} /> },
        ],
      },
      {
        label: 'CYCLES',
        items: [
          { tool: 'cycliclines', label: 'Cyclic lines', icon: <BarChart size={16} /> },
          { tool: 'timecycles', label: 'Time cycles', icon: <Timer size={16} /> },
          { tool: 'sineline', label: 'Sine line', icon: <Activity size={16} /> },
        ],
      },
    ],
  },
  {
    id: 'forecasting',
    icon: <Target size={TOOL_SIZE} />,
    label: 'Forecasting & Volume',
    groups: [
      {
        label: 'FORECASTING',
        items: [
          { tool: 'longposition', label: 'Long position', icon: <ArrowUpFromLine size={16} />, starred: true },
          { tool: 'shortposition', label: 'Short position', icon: <ArrowDownFromLine size={16} />, starred: true },
          { tool: 'positionforecast', label: 'Position forecast', icon: <Waypoints size={16} /> },
          { tool: 'barpattern', label: 'Bar pattern', icon: <BarChart size={16} /> },
          { tool: 'ghostfeed', label: 'Ghost feed', icon: <Ghost size={16} /> },
          { tool: 'sector', label: 'Sector', icon: <PieChart size={16} /> },
        ],
      },
      {
        label: 'VOLUME-BASED',
        items: [
          { tool: 'anchoredvwap', label: 'Anchored VWAP', icon: <Radar size={16} /> },
          { tool: 'fixedrangevolume', label: 'Fixed range volume profile', icon: <BarChart3 size={16} /> },
          { tool: 'anchoredvolume', label: 'Anchored volume profile', icon: <BarChart3 size={16} /> },
        ],
      },
      {
        label: 'MEASURERS',
        items: [
          { tool: 'pricerange', label: 'Price range', icon: <Ruler size={16} /> },
          { tool: 'daterange', label: 'Date range', icon: <Calendar size={16} /> },
          { tool: 'datepricerange', label: 'Date and price range', icon: <CalendarRange size={16} />, starred: true },
        ],
      },
    ],
  },
  {
    id: 'text',
    icon: <Type size={TOOL_SIZE} />,
    label: 'Text',
    groups: [{
      label: '',
      items: [
        { tool: 'text', label: 'Text', icon: <Type size={16} /> },
      ],
    }],
  },
  {
    id: 'emoji',
    icon: <Smile size={TOOL_SIZE} />,
    label: 'Emoji',
    groups: [{
      label: '',
      items: [
        { tool: 'emoji', label: 'Emoji', icon: <Smile size={16} /> },
      ],
    }],
  },
  {
    id: 'shapes',
    icon: <Brush size={TOOL_SIZE} />,
    label: 'Brushes & Shapes',
    groups: [
      {
        label: 'BRUSHES',
        items: [
          { tool: 'brush', label: 'Brush', icon: <Brush size={16} />, starred: true },
          { tool: 'highlighter', label: 'Highlighter', icon: <Highlighter size={16} /> },
        ],
      },
      {
        label: 'ARROWS',
        items: [
          { tool: 'arrowmarker', label: 'Arrow marker', icon: <Flag size={16} /> },
          { tool: 'arrowdraw', label: 'Arrow', icon: <Pencil size={16} /> },
          { tool: 'arrowmarkup', label: 'Arrow mark up', icon: <ArrowUp size={16} /> },
          { tool: 'arrowmarkdown', label: 'Arrow mark down', icon: <ArrowDown size={16} /> },
        ],
      },
      {
        label: 'SHAPES',
        items: [
          { tool: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal size={16} />, shortcut: 'Alt + Shift + R', starred: true },
          { tool: 'rotatedrectangle', label: 'Rotated rectangle', icon: <RotateCw size={16} /> },
          { tool: 'path', label: 'Path', icon: <Route size={16} /> },
          { tool: 'circle', label: 'Circle', icon: <CircleIcon size={16} /> },
          { tool: 'ellipse', label: 'Ellipse', icon: <Move3D size={16} /> },
          { tool: 'polyline', label: 'Polyline', icon: <Pentagon size={16} /> },
          { tool: 'triangle', label: 'Triangle', icon: <TriangleIcon size={16} /> },
          { tool: 'arc', label: 'Arc', icon: <Undo2 size={16} /> },
          { tool: 'curve', label: 'Curve', icon: <Spline size={16} /> },
          { tool: 'doublecurve', label: 'Double curve', icon: <Infinity size={16} /> },
        ],
      },
    ],
  },
];

// Bottom toolbar items (not drawing tools — utility actions)
const bottomActions = [
  { id: 'zoom', icon: <ZoomIn size={TOOL_SIZE} />, label: 'Zoom In' },
  { id: 'magnet', icon: <Magnet size={TOOL_SIZE} />, label: 'Magnet Mode' },
  { id: 'lock', icon: <Lock size={TOOL_SIZE} />, label: 'Lock Drawings' },
  { id: 'visibility', icon: <Eye size={TOOL_SIZE} />, label: 'Show/Hide Drawings' },
  { id: 'measure', icon: <Link size={TOOL_SIZE} />, label: 'Measure' },
];

export default function LeftToolbar() {
  const { drawingTool, setDrawingTool, drawings, removeDrawing } = useChart();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    magnet: false,
    lock: false,
    visibility: true,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Track which tool was selected per category
  const [selectedPerCategory, setSelectedPerCategory] = useState<Record<string, DrawingTool>>({
    cursor: 'cursor',
    lines: 'trendline',
    fibonacci: 'fibonacci',
    patterns: 'xabcd',
    forecasting: 'longposition',
    text: 'text',
    emoji: 'emoji',
    shapes: 'brush',
  });

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isToolActive = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return false;
    return cat.groups.some(g => g.items.some(t => t.tool === drawingTool));
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

  const handleToolSelect = (categoryId: string, tool: DrawingTool) => {
    setDrawingTool(tool);
    setSelectedPerCategory(prev => ({ ...prev, [categoryId]: tool }));
    setOpenCategory(null);
  };

  const handleToggle = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div ref={menuRef} className="relative flex flex-col items-center w-12 bg-toolbar-bg border-r border-chart-border py-1 gap-0.5 select-none z-30">
      {/* Drawing tool categories */}
      {categories.map(cat => (
        <div key={cat.id} className="relative">
          <button
            onClick={() => {
              if (openCategory === cat.id) {
                setOpenCategory(null);
              } else {
                setOpenCategory(cat.id);
              }
            }}
            onDoubleClick={() => {
              const tool = selectedPerCategory[cat.id] || cat.groups[0]?.items[0]?.tool;
              if (tool) setDrawingTool(tool);
            }}
            title={cat.label}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative ${
              isToolActive(cat.id)
                ? 'bg-toolbar-active text-primary-foreground'
                : openCategory === cat.id
                  ? 'bg-toolbar-hover text-foreground'
                  : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
            }`}
          >
            {getCategoryIcon(cat)}
            {/* Small triangle indicator for submenu */}
            <span className="absolute bottom-0.5 right-0.5 border-l-[3px] border-b-[3px] border-l-transparent border-b-muted-foreground/40 w-0 h-0" />
          </button>

          {/* Flyout submenu */}
          {openCategory === cat.id && (
            <div className="absolute left-full top-0 ml-1 bg-card border border-chart-border rounded-md shadow-2xl py-1 min-w-[260px] max-h-[80vh] overflow-y-auto z-50">
              {cat.groups.map((group, gi) => (
                <div key={gi}>
                  {group.label && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground tracking-wider">
                      {group.label}
                    </div>
                  )}
                  {gi > 0 && cat.groups[gi - 1].label && (
                    <div className="h-px bg-chart-border my-0.5" />
                  )}
                  {group.items.map(item => (
                    <button
                      key={item.tool}
                      onClick={() => handleToolSelect(cat.id, item.tool)}
                      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-toolbar-hover transition-colors group ${
                        drawingTool === item.tool ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      <span className="text-muted-foreground group-hover:text-foreground w-5 flex-shrink-0 flex justify-center">
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-muted-foreground ml-2">{item.shortcut}</span>
                      )}
                      <Star
                        size={11}
                        className={`ml-1 flex-shrink-0 ${
                          item.starred
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Separator */}
      <div className="w-6 h-px bg-chart-border my-1" />

      {/* Utility toggles */}
      {bottomActions.map(action => {
        const isToggleable = ['magnet', 'lock', 'visibility'].includes(action.id);
        const isOn = toggles[action.id];

        return (
          <button
            key={action.id}
            onClick={() => isToggleable ? handleToggle(action.id) : undefined}
            title={action.label}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
              isOn && isToggleable
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
            }`}
          >
            {action.icon}
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Delete all drawings */}
      {drawings.length > 0 && (
        <button
          onClick={() => drawings.forEach(d => removeDrawing(d.id))}
          title="Remove all drawings"
          className="w-9 h-9 flex items-center justify-center rounded text-muted-foreground hover:bg-toolbar-hover hover:text-destructive transition-colors"
        >
          <Trash2 size={TOOL_SIZE} />
        </button>
      )}
    </div>
  );
}
