import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '@/context/ChartContext';
import type { ChartDrawing, CoordHelper, CandleData, DrawingPoint } from '@/lib/drawing/types';
import { getToolPointCount } from '@/lib/drawing/types';
import { renderDrawing, getAnchors, renderAnchors } from '@/lib/drawing/renderers';
import { hitTestDrawing, hitTestAnchors } from '@/lib/drawing/hit-testing';
import { snapToCandle } from '@/lib/drawing/snap';
import type { Drawing } from '@/types/chart';
import FloatingToolbar from './FloatingToolbar';
import DrawingContextMenu from './DrawingContextMenu';
import DrawingSettingsDialog from './DrawingSettingsDialog';

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<any> | null;
  candles: CandleData[];
  containerRef: React.RefObject<HTMLDivElement>;
  magnetMode: boolean;
  priceScaleWidth?: number;
}

// Convert Drawing (context) to ChartDrawing (engine)
function toChartDrawing(d: Drawing): ChartDrawing {
  return { ...d, type: d.type as string };
}

function toDrawing(d: ChartDrawing): Drawing {
  return { ...d, type: d.type as Drawing['type'] };
}

export default function DrawingCanvas({ chart, series, candles, containerRef, magnetMode, priceScaleWidth = 55 }: Props) {
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
  const shiftKeyRef = useRef(false);

  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringDrawing, setIsHoveringDrawing] = useState(false);
  const [drawingCtxMenu, setDrawingCtxMenu] = useState<{ x: number; y: number; drawingId: string } | null>(null);
  const [settingsDrawingId, setSettingsDrawingId] = useState<string | null>(null);

  const chartDrawings = useMemo(() => drawings.map(toChartDrawing), [drawings]);

  const getCoordHelper = useCallback((): CoordHelper | null => {
    if (!chart || !series) return null;

    const getSpacing = () => {
      if (candles.length < 2) return null;
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      const lastX = chart.timeScale().timeToCoordinate(last.time as Time);
      const prevX = chart.timeScale().timeToCoordinate(prev.time as Time);
      const pixelsPerBar = lastX !== null && prevX !== null ? lastX - prevX : 0;
      const timeDelta = last.time - prev.time;
      if (!Number.isFinite(pixelsPerBar) || pixelsPerBar <= 0 || timeDelta <= 0) return null;
      return { lastX: lastX as number, lastTime: last.time, pixelsPerBar, timeDelta };
    };

    return {
      timeToX: (t: number) => {
        const x = chart.timeScale().timeToCoordinate(t as Time);
        if (x !== null) return x;
        const spacing = getSpacing();
        if (!spacing) return null;
        const barsAhead = (t - spacing.lastTime) / spacing.timeDelta;
        return spacing.lastX + barsAhead * spacing.pixelsPerBar;
      },
      priceToY: (p: number) => series.priceToCoordinate(p),
      xToTime: (x: number) => {
        const t = chart.timeScale().coordinateToTime(x);
        if (t !== null) return t as number;
        const spacing = getSpacing();
        if (!spacing) return null;
        const barsAhead = (x - spacing.lastX) / spacing.pixelsPerBar;
        return spacing.lastTime + Math.round(barsAhead) * spacing.timeDelta;
      },
      yToPrice: (y: number) => series.coordinateToPrice(y),
    };
  }, [chart, series, candles]);

  // Snap angle to 45-degree increments when Shift is held
  const snapAngle45 = useCallback((basePoint: DrawingPoint, rawPoint: DrawingPoint): DrawingPoint => {
    if (!shiftKeyRef.current) return rawPoint;
    const coord = getCoordHelper();
    if (!coord) return rawPoint;
    const bx = coord.timeToX(basePoint.time);
    const by = coord.priceToY(basePoint.price);
    const rx = coord.timeToX(rawPoint.time);
    const ry = coord.priceToY(rawPoint.price);
    if (bx === null || by === null || rx === null || ry === null) return rawPoint;
    const dx = rx - bx;
    const dy = ry - by;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return rawPoint;
    const angle = Math.atan2(dy, dx);
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const nx = bx + dist * Math.cos(snapped);
    const ny = by + dist * Math.sin(snapped);
    const newTime = coord.xToTime(nx);
    const newPrice = coord.yToPrice(ny);
    if (newTime === null || newPrice === null) return rawPoint;
    return { time: newTime, price: newPrice };
  }, [getCoordHelper]);

  const getMouseCoords = useCallback((e: MouseEvent | React.MouseEvent): { mx: number; my: number; time: number; price: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const coord = getCoordHelper();
    if (!coord) return null;

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
    const w = container.clientWidth - priceScaleWidth;
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

    for (const d of chartDrawings) {
      renderDrawing(ctx, d, coord, w, h);
      if (d.id === selectedDrawingId && d.selected) {
        const anchors = getAnchors(d, coord);
        renderAnchors(ctx, anchors);
        if (anchors.length > 0 && !isDraggingRef.current) {
          const minY = Math.min(...anchors.map(a => a.y));
          const avgX = anchors.reduce((s, a) => s + a.x, 0) / anchors.length;
            const next = { x: avgX, y: Math.max(minY - 45, 5) };
            setToolbarPos(prev => {
              if (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5) {
                return prev;
              }
              return next;
            });
        }
      }
    }

    // Preview
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
  }, [chartDrawings, selectedDrawingId, drawingTool, getCoordHelper, containerRef]);

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

    const container = containerRef.current;
    const w = container?.clientWidth || 0;
    const h = container?.clientHeight || 0;

    if (drawingTool === 'cursor' || drawingTool === 'dot' || drawingTool === 'arrow_cursor') {
      // Check anchor of selected
      if (selectedDrawingId) {
        const sel = chartDrawings.find(d => d.id === selectedDrawingId);
        if (sel && !sel.locked) {
          const anchorIdx = hitTestAnchors(sel, mx, my, coord);
          if (anchorIdx >= 0) {
            isDraggingRef.current = true;
            dragTypeRef.current = 'anchor';
            dragAnchorIdxRef.current = anchorIdx;
            dragStartRef.current = { mx, my, points: sel.points.map(p => ({ ...p })) };
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // Hit test all drawings
      for (let i = chartDrawings.length - 1; i >= 0; i--) {
        const d = chartDrawings[i];
        if (hitTestDrawing(d, mx, my, coord, w, h)) {
          setSelectedDrawingId(d.id);
          if (!d.locked) {
            isDraggingRef.current = true;
            dragTypeRef.current = 'move';
            dragStartRef.current = { mx, my, points: d.points.map(p => ({ ...p })) };
          }
          // Mark selected
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

      // Deselect
      if (selectedDrawingId) {
        const prev = drawings.find(d => d.id === selectedDrawingId);
        if (prev) updateDrawing(prev.id, { ...prev, selected: false });
        setSelectedDrawingId(null);
        setToolbarPos(null);
      }
      return;
    }

    // Brush/highlighter
    const toolPoints = getToolPointCount(drawingTool);
    if (toolPoints === -1) {
      if (['brush', 'highlighter'].includes(drawingTool)) {
        isBrushingRef.current = true;
        const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        brushDrawingIdRef.current = id;
        const newDrawing: Drawing = {
          id,
          type: drawingTool as Drawing['type'],
          points: [{ time, price }],
          color: drawingTool === 'highlighter' ? '#ffeb3b' : '#2962ff',
          lineWidth: drawingTool === 'highlighter' ? 12 : 2,
          selected: false,
          visible: true,
          locked: false,
        };
        addDrawing(newDrawing);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      pendingPointsRef.current = [...pendingPointsRef.current, { time, price }];
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    pendingPointsRef.current = [...pendingPointsRef.current, { time, price }];

    if (pendingPointsRef.current.length >= toolPoints) {
      const newDrawing: Drawing = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: drawingTool as Drawing['type'],
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
      // Auto-switch back to cursor after placing a drawing
      setDrawingTool('cursor');
    }

    e.preventDefault();
    e.stopPropagation();
  }, [drawingTool, drawings, chartDrawings, selectedDrawingId, getMouseCoords, getCoordHelper, addDrawing, updateDrawing, removeDrawing, setSelectedDrawingId, containerRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getMouseCoords(e as unknown as MouseEvent);
    if (!coords) return;
    const { mx, my, time, price } = coords;
    const coord = getCoordHelper();
    if (!coord) return;

    // Brush
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
        const idx = dragAnchorIdxRef.current;
        const newPoints = dragStartRef.current.points.map((p, i) => {
          if (i === idx) return { time, price };
          return { ...p };
        });
        updateDrawing(selected.id, { ...selected, points: newPoints });
      } else {
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

    // Preview
    if (pendingPointsRef.current.length > 0 && drawingTool !== 'cursor') {
      previewPointRef.current = { time, price };
    }

    // Cursor
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    if (drawingTool === 'cursor' || drawingTool === 'dot' || drawingTool === 'arrow_cursor') {
      let cursor = 'default';
      if (selectedDrawingId) {
        const sel = chartDrawings.find(d => d.id === selectedDrawingId);
        if (sel) {
          const anchorIdx = hitTestAnchors(sel, mx, my, coord);
          if (anchorIdx >= 0) cursor = 'grab';
        }
      }
      if (cursor === 'default') {
        for (let i = chartDrawings.length - 1; i >= 0; i--) {
          if (hitTestDrawing(chartDrawings[i], mx, my, coord, w, h)) {
            cursor = 'pointer';
            break;
          }
        }
      }
      canvas.style.cursor = cursor;
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, [drawingTool, drawings, chartDrawings, selectedDrawingId, getMouseCoords, getCoordHelper, updateDrawing, containerRef]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragAnchorIdxRef.current = -1;
    if (isBrushingRef.current) {
      isBrushingRef.current = false;
      brushDrawingIdRef.current = null;
      // Auto-switch back to cursor after brush/highlighter
      setDrawingTool('cursor');
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    const toolPoints = getToolPointCount(drawingTool);
    if (toolPoints === -1 && pendingPointsRef.current.length >= 2) {
      const newDrawing: Drawing = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: drawingTool as Drawing['type'],
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
      // Auto-switch back to cursor after multi-point drawing
      setDrawingTool('cursor');
    }
  }, [drawingTool, addDrawing, setDrawingTool]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      shiftKeyRef.current = e.shiftKey;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        // Don't delete if focused on an input
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        const sel = drawings.find(d => d.id === selectedDrawingId);
        if (sel && !sel.locked) {
          removeDrawing(selectedDrawingId);
          setSelectedDrawingId(null);
          setToolbarPos(null);
        }
      }
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
    const upHandler = (e: KeyboardEvent) => { shiftKeyRef.current = e.shiftKey; };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', upHandler); };
  }, [selectedDrawingId, drawings, removeDrawing, setSelectedDrawingId, updateDrawing]);

  useEffect(() => {
    pendingPointsRef.current = [];
    previewPointRef.current = null;
  }, [drawingTool]);

  const isCursorMode = drawingTool === 'cursor' || drawingTool === 'dot' || drawingTool === 'arrow_cursor';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isCursorMode || selectedDrawingId) {
      setIsHoveringDrawing(false);
      return;
    }

    const handleHoverMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Don't capture hover in the price scale area
      if (mx > container.clientWidth - priceScaleWidth) {
        setIsHoveringDrawing(false);
        return;
      }

      const coord = getCoordHelper();
      if (!coord) {
        setIsHoveringDrawing(false);
        return;
      }

      const w = container.clientWidth;
      const h = container.clientHeight;
      let found = false;

      for (let i = chartDrawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(chartDrawings[i], mx, my, coord, w, h)) {
          found = true;
          break;
        }
      }

      setIsHoveringDrawing(prev => (prev === found ? prev : found));
    };

    const handleLeave = () => setIsHoveringDrawing(false);

    container.addEventListener('mousemove', handleHoverMove);
    container.addEventListener('mouseleave', handleLeave);

    return () => {
      container.removeEventListener('mousemove', handleHoverMove);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, [isCursorMode, selectedDrawingId, chartDrawings, getCoordHelper, containerRef]);

  const shouldCapturePointer = !isCursorMode || selectedDrawingId !== null || isHoveringDrawing;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const coord = getCoordHelper();
    const container = containerRef.current;
    if (!coord || !container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = container.clientWidth;
    const h = container.clientHeight;

    for (let i = chartDrawings.length - 1; i >= 0; i--) {
      if (hitTestDrawing(chartDrawings[i], mx, my, coord, w, h)) {
        e.preventDefault();
        e.stopPropagation();
        setDrawingCtxMenu({ x: e.clientX, y: e.clientY, drawingId: chartDrawings[i].id });
        return;
      }
    }
  }, [chartDrawings, getCoordHelper, containerRef]);

  const ctxDrawing = drawingCtxMenu ? drawings.find(d => d.id === drawingCtxMenu.drawingId) || null : null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 bottom-0 z-20"
        style={{
          pointerEvents: shouldCapturePointer ? 'auto' : 'none',
          right: priceScaleWidth,
          width: `calc(100% - ${priceScaleWidth}px)`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
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
              const clone: Drawing = {
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
          onOpenSettings={() => setSettingsDrawingId(selectedDrawingId)}
        />
      )}
      <DrawingContextMenu
        open={!!drawingCtxMenu}
        position={drawingCtxMenu || { x: 0, y: 0 }}
        drawing={ctxDrawing}
        onClose={() => setDrawingCtxMenu(null)}
        onUpdate={(updates) => {
          if (ctxDrawing) updateDrawing(ctxDrawing.id, { ...ctxDrawing, ...updates });
        }}
        onClone={() => {
          if (ctxDrawing) {
            const clone: Drawing = {
              ...ctxDrawing,
              id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              points: ctxDrawing.points.map(p => ({ ...p })),
              selected: false,
            };
            addDrawing(clone);
          }
        }}
        onDelete={() => {
          if (ctxDrawing) {
            removeDrawing(ctxDrawing.id);
            setSelectedDrawingId(null);
            setToolbarPos(null);
          }
        }}
        onOpenSettings={() => {
          if (ctxDrawing) setSettingsDrawingId(ctxDrawing.id);
        }}
      />
      <DrawingSettingsDialog
        open={!!settingsDrawingId}
        drawing={settingsDrawingId ? drawings.find(d => d.id === settingsDrawingId) || null : null}
        onClose={() => setSettingsDrawingId(null)}
        onUpdate={(updates) => {
          if (settingsDrawingId) {
            const d = drawings.find(dd => dd.id === settingsDrawingId);
            if (d) updateDrawing(d.id, { ...d, ...updates });
          }
        }}
      />
    </>
  );
}

function getDefaultColor(tool: string): string {
  switch (tool) {
    case 'fibonacci': case 'fibextension': return '#787b86';
    case 'highlighter': return '#ffeb3b';
    case 'arrowmarkup': case 'longposition': return '#26a69a';
    case 'arrowmarkdown': case 'shortposition': return '#ef5350';
    default: return '#2962ff';
  }
}
