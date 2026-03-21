import { useRef, useEffect, useCallback, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '@/context/ChartContext';
import type { ChartDrawing, CoordHelper, CandleData, DrawingPoint } from '@/lib/drawing/types';
import { getToolPointCount } from '@/lib/drawing/types';
import { renderDrawing, getAnchors, renderAnchors } from '@/lib/drawing/renderers';
import { hitTestDrawing, hitTestAnchors } from '@/lib/drawing/hit-testing';
import { snapToCandle } from '@/lib/drawing/snap';
import FloatingToolbar from './FloatingToolbar';

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  candles: CandleData[];
  containerRef: React.RefObject<HTMLDivElement>;
  magnetMode: boolean;
}

export default function DrawingCanvas({ chart, series, candles, containerRef, magnetMode }: Props) {
  const { drawingTool, setDrawingTool, drawings, addDrawing, updateDrawing, removeDrawing, selectedDrawingId, setSelectedDrawingId } = useChart();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Drawing-in-progress state
  const pendingPointsRef = useRef<DrawingPoint[]>([]);
  const previewPointRef = useRef<DrawingPoint | null>(null);
  const isDraggingRef = useRef(false);
  const dragTypeRef = useRef<'move' | 'anchor'>('move');
  const dragAnchorIdxRef = useRef(-1);
  const dragStartRef = useRef<{ mx: number; my: number; points: DrawingPoint[] } | null>(null);
  const isBrushingRef = useRef(false);
  const brushDrawingIdRef = useRef<string | null>(null);

  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);

  const getCoordHelper = useCallback((): CoordHelper | null => {
    if (!chart || !series) return null;
    return {
      timeToX: (t: number) => chart.timeScale().timeToCoordinate(t as Time),
      priceToY: (p: number) => series.priceToCoordinate(p),
      xToTime: (x: number) => {
        const t = chart.timeScale().coordinateToTime(x);
        return t !== null ? (t as number) : null;
      },
      yToPrice: (y: number) => series.coordinateToPrice(y),
    };
  }, [chart, series]);

  const getMouseCoords = useCallback((e: MouseEvent | React.MouseEvent): { mx: number; my: number; time: number; price: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const coord = getCoordHelper();
    if (!coord) return null;

    // Apply magnet if enabled
    if (magnetMode && candles.length > 0) {
      const snapped = snapToCandle(mx, my, candles, coord);
      if (snapped) return { mx, my, time: snapped.time, price: snapped.price };
    }

    const time = coord.xToTime(mx);
    const price = coord.yToPrice(my);
    if (time === null || price === null) return null;
    return { mx, my, time, price };
  }, [getCoordHelper, magnetMode, candles]);

  // ─── Render loop ───
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const coord = getCoordHelper();
    if (!canvas || !container || !coord) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Render all completed drawings
    for (const d of drawings) {
      renderDrawing(ctx, d, coord, w, h);
      // Render anchors for selected drawing
      if (d.id === selectedDrawingId && d.selected) {
        const anchors = getAnchors(d, coord);
        renderAnchors(ctx, anchors);
        // Update toolbar position
        if (anchors.length > 0 && !isDraggingRef.current) {
          const minY = Math.min(...anchors.map(a => a.y));
          const avgX = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
          setToolbarPos({ x: avgX, y: Math.max(minY - 45, 5) });
        }
      }
    }

    // Render drawing-in-progress preview
    if (pendingPointsRef.current.length > 0 && drawingTool !== 'cursor') {
      const previewPts = [...pendingPointsRef.current];
      if (previewPointRef.current) previewPts.push(previewPointRef.current);

      const previewDrawing: ChartDrawing = {
        id: '__preview__',
        type: drawingTool,
        points: previewPts,
        color: '#2962ff',
        lineWidth: 2,
        selected: false,
        visible: true,
        locked: false,
      };
      ctx.globalAlpha = 0.7;
      renderDrawing(ctx, previewDrawing, coord, w, h);
      ctx.globalAlpha = 1;

      // Draw pending anchor points
      for (const pt of pendingPointsRef.current) {
        const x = coord.timeToX(pt.time);
        const y = coord.priceToY(pt.price);
        if (x !== null && y !== null) {
          ctx.fillStyle = '#2962ff';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [drawings, selectedDrawingId, drawingTool, getCoordHelper, containerRef]);

  // Animation frame loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [render]);

  // Subscribe to chart changes to trigger re-render
  useEffect(() => {
    if (!chart) return;
    const redraw = () => render();
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(redraw);
  }, [chart, render]);

  // ─── Mouse handlers ───

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getMouseCoords(e as unknown as MouseEvent);
    if (!coords) return;
    const { mx, my, time, price } = coords;
    const coord = getCoordHelper();
    if (!coord) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const w = container?.clientWidth || 0;
    const h = container?.clientHeight || 0;

    // If in cursor mode, check for selection/dragging
    if (drawingTool === 'cursor' || drawingTool === 'arrow_cursor') {
      // First check if clicking on an anchor of the selected drawing
      if (selectedDrawingId) {
        const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
        if (selectedDrawing && !selectedDrawing.locked) {
          const anchorIdx = hitTestAnchors(selectedDrawing, mx, my, coord);
          if (anchorIdx >= 0) {
            isDraggingRef.current = true;
            dragTypeRef.current = 'anchor';
            dragAnchorIdxRef.current = anchorIdx;
            dragStartRef.current = { mx, my, points: selectedDrawing.points.map(p => ({ ...p })) };
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // Check hit test on all drawings (reverse order = top first)
      for (let i = drawings.length - 1; i >= 0; i--) {
        const d = drawings[i];
        if (hitTestDrawing(d, mx, my, coord, w, h)) {
          setSelectedDrawingId(d.id);
          if (!d.locked) {
            isDraggingRef.current = true;
            dragTypeRef.current = 'move';
            dragStartRef.current = { mx, my, points: d.points.map(p => ({ ...p })) };
          }
          // Select the drawing
          for (const dd of drawings) {
            if (dd.id === d.id && !dd.selected) {
              updateDrawing(dd.id, { ...dd, selected: true });
            } else if (dd.id !== d.id && dd.selected) {
              updateDrawing(dd.id, { ...dd, selected: false });
            }
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Clicked on nothing - deselect
      if (selectedDrawingId) {
        const prev = drawings.find(d => d.id === selectedDrawingId);
        if (prev) updateDrawing(prev.id, { ...prev, selected: false });
        setSelectedDrawingId(null);
        setToolbarPos(null);
      }
      return;
    }

    // Eraser mode
    if (drawingTool === 'eraser') {
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], mx, my, coord, w, h)) {
          removeDrawing(drawings[i].id);
          return;
        }
      }
      return;
    }

    // Brush/highlighter: start freehand
    const toolPoints = getToolPointCount(drawingTool);
    if (toolPoints === -1) {
      if (['brush', 'highlighter'].includes(drawingTool)) {
        isBrushingRef.current = true;
        const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        brushDrawingIdRef.current = id;
        addDrawing({
          id,
          type: drawingTool,
          points: [{ time, price }],
          color: drawingTool === 'highlighter' ? '#ffeb3b' : '#2962ff',
          lineWidth: drawingTool === 'highlighter' ? 12 : 2,
          selected: false,
          visible: true,
          locked: false,
        });
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Other unlimited-point tools: click to add, double-click to finish
      pendingPointsRef.current = [...pendingPointsRef.current, { time, price }];
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Standard multi-click tools
    pendingPointsRef.current = [...pendingPointsRef.current, { time, price }];

    if (pendingPointsRef.current.length >= toolPoints) {
      // Complete the drawing
      const newDrawing: ChartDrawing = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: drawingTool,
        points: [...pendingPointsRef.current],
        color: getDefaultColor(drawingTool),
        lineWidth: 2,
        selected: false,
        visible: true,
        locked: false,
        props: drawingTool === 'text' ? { text: 'Text', fontSize: 14 } : undefined,
      };
      addDrawing(newDrawing);
      pendingPointsRef.current = [];
      previewPointRef.current = null;
    }

    e.preventDefault();
    e.stopPropagation();
  }, [drawingTool, drawings, selectedDrawingId, getMouseCoords, getCoordHelper, addDrawing, updateDrawing, removeDrawing, setSelectedDrawingId, containerRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getMouseCoords(e as unknown as MouseEvent);
    if (!coords) return;
    const { mx, my, time, price } = coords;
    const coord = getCoordHelper();
    if (!coord) return;

    // Brush mode: add points continuously
    if (isBrushingRef.current && brushDrawingIdRef.current) {
      const existing = drawings.find(d => d.id === brushDrawingIdRef.current);
      if (existing) {
        updateDrawing(existing.id, {
          ...existing,
          points: [...existing.points, { time, price }],
        });
      }
      return;
    }

    // Dragging
    if (isDraggingRef.current && dragStartRef.current && selectedDrawingId) {
      const selected = drawings.find(d => d.id === selectedDrawingId);
      if (!selected) return;

      const dx = mx - dragStartRef.current.mx;
      const dy = my - dragStartRef.current.my;

      if (dragTypeRef.current === 'anchor') {
        // Move single anchor
        const idx = dragAnchorIdxRef.current;
        const newPoints = dragStartRef.current.points.map((p, i) => {
          if (i === idx) return { time, price };
          return { ...p };
        });
        updateDrawing(selected.id, { ...selected, points: newPoints });
      } else {
        // Move entire drawing
        const newPoints = dragStartRef.current.points.map(p => {
          const origX = coord.timeToX(p.time);
          const origY = coord.priceToY(p.price);
          if (origX === null || origY === null) return p;
          const newTime = coord.xToTime(origX + dx);
          const newPrice = coord.yToPrice(origY + dy);
          if (newTime === null || newPrice === null) return p;
          return { time: newTime, price: newPrice };
        });
        updateDrawing(selected.id, { ...selected, points: newPoints });
      }
      return;
    }

    // Preview for drawing in progress
    if (pendingPointsRef.current.length > 0 && drawingTool !== 'cursor') {
      previewPointRef.current = { time, price };
    }

    // Change cursor for hit testing
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (drawingTool === 'cursor' || drawingTool === 'arrow_cursor') {
      let cursor = 'default';
      // Check anchors of selected drawing
      if (selectedDrawingId) {
        const sel = drawings.find(d => d.id === selectedDrawingId);
        if (sel) {
          const anchorIdx = hitTestAnchors(sel, mx, my, coord);
          if (anchorIdx >= 0) {
            cursor = 'grab';
          }
        }
      }
      // Check body hit
      if (cursor === 'default') {
        for (let i = drawings.length - 1; i >= 0; i--) {
          if (hitTestDrawing(drawings[i], mx, my, coord, w, h)) {
            cursor = 'pointer';
            break;
          }
        }
      }
      canvas.style.cursor = cursor;
    } else if (drawingTool === 'eraser') {
      canvas.style.cursor = 'not-allowed';
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], mx, my, coord, w, h)) {
          canvas.style.cursor = 'pointer';
          break;
        }
      }
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, [drawingTool, drawings, selectedDrawingId, getMouseCoords, getCoordHelper, updateDrawing, containerRef]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragAnchorIdxRef.current = -1;

    if (isBrushingRef.current) {
      isBrushingRef.current = false;
      brushDrawingIdRef.current = null;
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Finish unlimited-point tools
    const toolPoints = getToolPointCount(drawingTool);
    if (toolPoints === -1 && pendingPointsRef.current.length >= 2) {
      const newDrawing: ChartDrawing = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: drawingTool,
        points: [...pendingPointsRef.current],
        color: getDefaultColor(drawingTool),
        lineWidth: 2,
        selected: false,
        visible: true,
        locked: false,
      };
      addDrawing(newDrawing);
      pendingPointsRef.current = [];
      previewPointRef.current = null;
    }
  }, [drawingTool, addDrawing]);

  // Keyboard handler (Delete key)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        const sel = drawings.find(d => d.id === selectedDrawingId);
        if (sel && !sel.locked) {
          removeDrawing(selectedDrawingId);
          setSelectedDrawingId(null);
          setToolbarPos(null);
        }
      }
      // Escape to cancel drawing in progress
      if (e.key === 'Escape') {
        if (pendingPointsRef.current.length > 0) {
          pendingPointsRef.current = [];
          previewPointRef.current = null;
        }
        if (selectedDrawingId) {
          const sel = drawings.find(d => d.id === selectedDrawingId);
          if (sel) updateDrawing(sel.id, { ...sel, selected: false });
          setSelectedDrawingId(null);
          setToolbarPos(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedDrawingId, drawings, removeDrawing, setSelectedDrawingId, updateDrawing]);

  // Reset pending when tool changes
  useEffect(() => {
    pendingPointsRef.current = [];
    previewPointRef.current = null;
  }, [drawingTool]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20"
        style={{ pointerEvents: (drawingTool !== 'cursor' && drawingTool !== 'arrow_cursor' && drawingTool !== 'eraser' && drawings.some(d => d.selected)) || drawingTool !== 'cursor' ? 'auto' : 'auto' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {selectedDrawingId && toolbarPos && (
        <FloatingToolbar
          x={toolbarPos.x}
          y={toolbarPos.y}
          drawing={drawings.find(d => d.id === selectedDrawingId) || null}
          onUpdate={(updates) => {
            const d = drawings.find(dd => dd.id === selectedDrawingId);
            if (d) updateDrawing(d.id, { ...d, ...updates });
          }}
          onClone={() => {
            const d = drawings.find(dd => dd.id === selectedDrawingId);
            if (d) {
              const clone: ChartDrawing = {
                ...d,
                id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                points: d.points.map(p => ({ ...p })),
                selected: false,
              };
              addDrawing(clone);
            }
          }}
          onDelete={() => {
            removeDrawing(selectedDrawingId);
            setSelectedDrawingId(null);
            setToolbarPos(null);
          }}
        />
      )}
    </>
  );
}

function getDefaultColor(tool: string): string {
  switch (tool) {
    case 'fibonacci':
    case 'fibextension':
      return '#787b86';
    case 'highlighter':
      return '#ffeb3b';
    case 'arrowmarkup':
      return '#26a69a';
    case 'arrowmarkdown':
      return '#ef5350';
    case 'longposition':
      return '#26a69a';
    case 'shortposition':
      return '#ef5350';
    default:
      return '#2962ff';
  }
}
