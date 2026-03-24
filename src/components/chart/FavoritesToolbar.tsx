import { useState, useRef, useEffect, useCallback } from 'react';
import { useChart } from '@/context/ChartContext';
import type { DrawingTool } from '@/types/chart';
import {
  getAllToolItems, getStarredTools, getFavoritesBarPosition, saveFavoritesBarPosition,
  type ToolItem,
} from '@/lib/drawingToolCategories';
import {
  Crosshair, CircleDot, ArrowUpRight, TrendingUp, MoveRight, Info, ArrowRight,
  Triangle as TriangleIcon, Minus, ArrowRightFromLine, ArrowDownUp, X,
  Columns3, TrendingDown, AlignHorizontalSpaceAround, SplitSquareHorizontal,
  GitBranch, GitFork, ArrowDownToLine,
  BarChart3, Waves, Circle, Disc, Fan, Target, Compass, Spline, CircleDashed, Slice, Wind,
  Grid3X3, LayoutGrid, Square, BarChart2,
  Network, Fingerprint, Crown, Diamond, Hexagon,
  BarChart, Timer, Activity,
  ArrowUpFromLine, ArrowDownFromLine, Waypoints, Ghost, PieChart,
  Ruler, Calendar, CalendarRange,
  Brush, Highlighter,
  Flag, Pencil, ArrowUp, ArrowDown,
  RectangleHorizontal, RotateCw, Route, CircleIcon, Move3D, Pentagon,
  Undo2, Infinity,
  Type, MessageSquare,
  GripVertical,
} from 'lucide-react';

const ICON_SIZE = 16;

const iconMap: Record<string, React.ReactNode> = {
  Crosshair: <Crosshair size={ICON_SIZE} />,
  CircleDot: <CircleDot size={ICON_SIZE} />,
  ArrowUpRight: <ArrowUpRight size={ICON_SIZE} />,
  TrendingUp: <TrendingUp size={ICON_SIZE} />,
  MoveRight: <MoveRight size={ICON_SIZE} />,
  Info: <Info size={ICON_SIZE} />,
  ArrowRight: <ArrowRight size={ICON_SIZE} />,
  Triangle: <TriangleIcon size={ICON_SIZE} />,
  Minus: <Minus size={ICON_SIZE} />,
  ArrowRightFromLine: <ArrowRightFromLine size={ICON_SIZE} />,
  ArrowDownUp: <ArrowDownUp size={ICON_SIZE} />,
  X: <X size={ICON_SIZE} />,
  Columns3: <Columns3 size={ICON_SIZE} />,
  TrendingDown: <TrendingDown size={ICON_SIZE} />,
  AlignHorizontalSpaceAround: <AlignHorizontalSpaceAround size={ICON_SIZE} />,
  SplitSquareHorizontal: <SplitSquareHorizontal size={ICON_SIZE} />,
  GitBranch: <GitBranch size={ICON_SIZE} />,
  GitFork: <GitFork size={ICON_SIZE} />,
  ArrowDownToLine: <ArrowDownToLine size={ICON_SIZE} />,
  BarChart3: <BarChart3 size={ICON_SIZE} />,
  Waves: <Waves size={ICON_SIZE} />,
  Circle: <Circle size={ICON_SIZE} />,
  Disc: <Disc size={ICON_SIZE} />,
  Fan: <Fan size={ICON_SIZE} />,
  Target: <Target size={ICON_SIZE} />,
  Compass: <Compass size={ICON_SIZE} />,
  Spline: <Spline size={ICON_SIZE} />,
  CircleDashed: <CircleDashed size={ICON_SIZE} />,
  Slice: <Slice size={ICON_SIZE} />,
  Wind: <Wind size={ICON_SIZE} />,
  Grid3X3: <Grid3X3 size={ICON_SIZE} />,
  LayoutGrid: <LayoutGrid size={ICON_SIZE} />,
  Square: <Square size={ICON_SIZE} />,
  BarChart2: <BarChart2 size={ICON_SIZE} />,
  Network: <Network size={ICON_SIZE} />,
  Fingerprint: <Fingerprint size={ICON_SIZE} />,
  Crown: <Crown size={ICON_SIZE} />,
  Diamond: <Diamond size={ICON_SIZE} />,
  Hexagon: <Hexagon size={ICON_SIZE} />,
  BarChart: <BarChart size={ICON_SIZE} />,
  Timer: <Timer size={ICON_SIZE} />,
  Activity: <Activity size={ICON_SIZE} />,
  ArrowUpFromLine: <ArrowUpFromLine size={ICON_SIZE} />,
  ArrowDownFromLine: <ArrowDownFromLine size={ICON_SIZE} />,
  Waypoints: <Waypoints size={ICON_SIZE} />,
  Ghost: <Ghost size={ICON_SIZE} />,
  PieChart: <PieChart size={ICON_SIZE} />,
  Ruler: <Ruler size={ICON_SIZE} />,
  Calendar: <Calendar size={ICON_SIZE} />,
  CalendarRange: <CalendarRange size={ICON_SIZE} />,
  Brush: <Brush size={ICON_SIZE} />,
  Highlighter: <Highlighter size={ICON_SIZE} />,
  Flag: <Flag size={ICON_SIZE} />,
  Pencil: <Pencil size={ICON_SIZE} />,
  ArrowUp: <ArrowUp size={ICON_SIZE} />,
  ArrowDown: <ArrowDown size={ICON_SIZE} />,
  RectangleHorizontal: <RectangleHorizontal size={ICON_SIZE} />,
  RotateCw: <RotateCw size={ICON_SIZE} />,
  Route: <Route size={ICON_SIZE} />,
  CircleIcon: <CircleIcon size={ICON_SIZE} />,
  Move3D: <Move3D size={ICON_SIZE} />,
  Pentagon: <Pentagon size={ICON_SIZE} />,
  Undo2: <Undo2 size={ICON_SIZE} />,
  Infinity: <Infinity size={ICON_SIZE} />,
  Type: <Type size={ICON_SIZE} />,
  MessageSquare: <MessageSquare size={ICON_SIZE} />,
};

export default function FavoritesToolbar() {
  const { drawingTool, setDrawingTool } = useChart();
  const [position, setPosition] = useState(getFavoritesBarPosition);
  const [starredTools, setStarredToolsState] = useState<Set<string>>(getStarredTools);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Listen for starred tools changes from LeftToolbar
  useEffect(() => {
    const handler = () => setStarredToolsState(getStarredTools());
    window.addEventListener('starred-tools-changed', handler);
    return () => window.removeEventListener('starred-tools-changed', handler);
  }, []);

  const allItems = getAllToolItems();
  const starredItems = allItems.filter(item => starredTools.has(item.tool));

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from the grip handle
    if (!(e.target as HTMLElement).closest('[data-drag-handle]')) return;
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };
    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        setPosition(prev => {
          saveFavoritesBarPosition(prev);
          return prev;
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (starredItems.length === 0) return null;

  return (
    <div
      ref={barRef}
      onMouseDown={handleMouseDown}
      className="fixed z-40 flex items-center gap-0.5 bg-card/95 backdrop-blur-sm border border-chart-border rounded-lg shadow-xl px-1 py-0.5"
      style={{ left: position.x, top: position.y }}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        className="cursor-grab active:cursor-grabbing flex items-center justify-center w-6 h-8 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
      >
        <GripVertical size={14} />
      </div>

      {/* Tool buttons */}
      {starredItems.map((item) => (
        <button
          key={item.tool}
          onClick={() => setDrawingTool(item.tool)}
          title={item.label}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
            drawingTool === item.tool
              ? 'bg-toolbar-active text-primary-foreground'
              : 'text-muted-foreground hover:bg-toolbar-hover hover:text-foreground'
          }`}
        >
          {iconMap[item.iconName] || <span className="text-xs">?</span>}
        </button>
      ))}
    </div>
  );
}
