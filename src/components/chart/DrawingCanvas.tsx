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
import DrawingSettingsDialog, { getDefaultTemplate } from './DrawingSettingsDialog';

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
  const { drawingTool, setDrawingTool, drawings, addDrawing, updateDrawing, removeDrawing, selectedDrawingId, setSelectedDrawingId, selectedDrawingIds, setSelectedDrawingIds, toggleSelectedDrawing, undoDrawing, redoDrawing, canUndoDrawing, canRedoDrawing } = useChart();
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
  const ctrlKeyRef = useRef(false);
  const areaSelectStartRef = useRef<{ x: number; y: number } | null>(null);
  const areaSelectEndRef = useRef<{ x: number; y: number } | null>(null);

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
      renderDrawing(ctx, d, coord, w, h, candles);
      const isSelected = d.id === selectedDrawingId || selectedDrawingIds.has(d.id);
      if (isSelected) {
        const anchors = getAnchors(d, coord);
        renderAnchors(ctx, anchors);
      }
    }

    // Toolbar position for primary selected or multi-select
    const allSelectedIds = new Set(selectedDrawingIds);
    if (selectedDrawingId) allSelectedIds.add(selectedDrawingId);
    if (allSelectedIds.size > 0 && !isDraggingRef.current) {
      const allAnchors: { x: number; y: number }[] = [];
      for (const d of chartDrawings) {
        if (allSelectedIds.has(d.id)) {
          const anchors = getAnchors(d, coord);
          allAnchors.push(...anchors);
        }
      }
      if (allAnchors.length > 0) {
        const minY = Math.min(...allAnchors.map(a => a.y));
        const avgX = allAnchors.reduce((s, a) => s + a.x, 0) / allAnchors.length;
        const next = { x: avgX, y: Math.max(minY - 45, 5) };
        setToolbarPos(prev => {
          if (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5) return prev;
          return next;
        });
      }
    }

    // Area selection rectangle
    if (areaSelectStartRef.current && areaSelectEndRef.current) {
      const s = areaSelectStartRef.current;
      const e = areaSelectEndRef.current;
      ctx.save();
      ctx.strokeStyle = '#2962ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = 'rgba(41, 98, 255, 0.08)';
      const rx = Math.min(s.x, e.x);
      const ry = Math.min(s.y, e.y);
      const rw = Math.abs(e.x - s.x);
      const rh = Math.abs(e.y - s.y);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // Preview
    if (pendingPointsRef.current.length > 0 && drawingTool !== 'cursor') {
      const previewPts = [...pendingPointsRef.current];
      if (previewPointRef.current) previewPts.push(previewPointRef.current);

      const previewProps = drawingTool === 'emoji' ? (() => { try { const s = localStorage.getItem('drawingToolProps'); return s ? JSON.parse(s) : { emoji: '😀' }; } catch { return { emoji: '😀' }; } })() : undefined;
      const previewDrawing: ChartDrawing = {
        id: '__preview__',
        type: drawingTool,
        points: previewPts,
        color: '#2962ff',
        lineWidth: 2,
        selected: false,
        visible: true,
        locked: false,
        props: previewProps,
      };
      ctx.globalAlpha = 0.7;
      renderDrawing(ctx, previewDrawing, coord, w, h, candles);
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
  }, [chartDrawings, selectedDrawingId, selectedDrawingIds, drawingTool, getCoordHelper, containerRef]);

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
      const isCtrl = e.ctrlKey || e.metaKey;
      ctrlKeyRef.current = isCtrl;

      // Check anchor of selected (single select only)
      if (selectedDrawingId && !isCtrl) {
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
          if (isCtrl) {
            // Ctrl+Click: toggle in multi-select
            toggleSelectedDrawing(d.id);
            if (selectedDrawingId === d.id) {
              setSelectedDrawingId(null);
            } else if (!selectedDrawingId) {
              setSelectedDrawingId(d.id);
            }
          } else {
            // Normal click: single select (clear multi)
            setSelectedDrawingIds(new Set());
            setSelectedDrawingId(d.id);
            if (!d.locked) {
              isDraggingRef.current = true;
              dragTypeRef.current = 'move';
              dragStartRef.current = { mx, my, points: d.points.map(p => ({ ...p })) };
            }
          }
          // Mark selected state on drawing
          for (const dd of drawings) {
            const shouldSelect = dd.id === d.id || (isCtrl && selectedDrawingIds.has(dd.id));
            if (dd.selected !== shouldSelect) {
              updateDrawing(dd.id, { ...dd, selected: shouldSelect });
            }
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Clicked empty area - start area selection or deselect
      if (!isCtrl) {
        // Start area selection
        areaSelectStartRef.current = { x: mx, y: my };
        areaSelectEndRef.current = { x: mx, y: my };
      }

      // Deselect all
      if (selectedDrawingId) {
        const prev = drawings.find(d => d.id === selectedDrawingId);
        if (prev) updateDrawing(prev.id, { ...prev, selected: false });
        setSelectedDrawingId(null);
      }
      if (selectedDrawingIds.size > 0) {
        for (const dd of drawings) {
          if (dd.selected) updateDrawing(dd.id, { ...dd, selected: false });
        }
        setSelectedDrawingIds(new Set());
      }
      setToolbarPos(null);
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

    // Ignore second click of a double-click for single-point tools (prevents duplicate Text/Note)
    if (toolPoints === 1 && e.detail > 1) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Shift-snap for second point on line-type tools
    let pointToAdd = { time, price };
    if (pendingPointsRef.current.length === 1 && ['trendline', 'ray', 'extendedline', 'infoline', 'trendangle'].includes(drawingTool)) {
      pointToAdd = snapAngle45(pendingPointsRef.current[0], pointToAdd);
    }
    pendingPointsRef.current = [...pendingPointsRef.current, pointToAdd];

    if (pendingPointsRef.current.length >= toolPoints) {
      const defaultTmpl = getDefaultTemplate(drawingTool);
      let drawingProps: Record<string, any> | undefined = drawingTool === 'text' ? { text: 'Text', fontSize: 14 } 
           : drawingTool === 'emoji' ? (() => { try { const s = localStorage.getItem('drawingToolProps'); return s ? JSON.parse(s) : { emoji: '😀' }; } catch { return { emoji: '😀' }; } })()
           : drawingTool === 'note' ? { text: 'Note', fontSize: 12 } 
           : undefined;
      if (defaultTmpl) {
        drawingProps = { ...drawingProps, ...defaultTmpl.props };
      }
      // Auto-set initial stop loss for position tools
      if (drawingTool === 'longposition' || drawingTool === 'shortposition') {
        const pts = pendingPointsRef.current;
        const entry = pts[0].price;
        const tp = pts[1].price;
        const tpDist = Math.abs(tp - entry);
        const isLong = drawingTool === 'longposition';
        const stopPrice = isLong ? entry - tpDist * 0.5 : entry + tpDist * 0.5;
        drawingProps = { ...drawingProps, stopPrice, accountSize: 10000, riskPercent: 2, leverage: 1, lotSize: 1, pointValue: 1 };
      }
      const newDrawing: Drawing = {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: drawingTool as Drawing['type'],
        points: [...pendingPointsRef.current],
        color: defaultTmpl?.color || getDefaultColor(drawingTool),
        lineWidth: defaultTmpl?.lineWidth || 2,
        selected: false,
        visible: true,
        locked: false,
        props: drawingProps,
      };
      addDrawing(newDrawing);
      pendingPointsRef.current = [];
      previewPointRef.current = null;
      // Auto-switch back to cursor after placing a drawing
      setDrawingTool('cursor');
    }

    e.preventDefault();
    e.stopPropagation();
  }, [drawingTool, drawings, chartDrawings, selectedDrawingId, selectedDrawingIds, getMouseCoords, getCoordHelper, addDrawing, updateDrawing, removeDrawing, setSelectedDrawingId, setSelectedDrawingIds, toggleSelectedDrawing, containerRef, snapAngle45]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getMouseCoords(e as unknown as MouseEvent);
    if (!coords) return;
    const { mx, my, time, price } = coords;
    const coord = getCoordHelper();
    if (!coord) return;

    // Area selection
    if (areaSelectStartRef.current) {
      areaSelectEndRef.current = { x: mx, y: my };
      return;
    }

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
        
        // Handle virtual anchors for parallel channel
        if (selected.type === 'parallelchannel' && idx >= 10 && selected.points.length >= 3) {
          const origPoints = dragStartRef.current.points;
          const newPoints = origPoints.map(p => ({ ...p }));
          const origP1Y = coord.priceToY(origPoints[0].price);
          const origP2Y = coord.priceToY(origPoints[1].price);
          const origP3Y = coord.priceToY(origPoints[2].price);
          if (origP1Y === null || origP2Y === null || origP3Y === null) return;
          const origOffsetY = origP3Y - origP1Y;
          
          if (idx === 10) {
            // Bottom-left: move point 0's corresponding bottom anchor -> adjust channel width (point 2)
            // The bottom-left is at p1 + offset. Moving it changes the offset.
            const newOffsetPrice = price - origPoints[0].price;
            newPoints[2] = { time: origPoints[2].time, price: origPoints[0].price + newOffsetPrice };
            // Also allow horizontal movement of point 0
            newPoints[0] = { time, price: origPoints[0].price };
            newPoints[2] = { time: origPoints[2].time, price: origPoints[0].price + newOffsetPrice };
          } else if (idx === 12) {
            // Bottom-right: move point 1's corresponding bottom anchor
            const newOffsetPrice = price - origPoints[1].price;
            newPoints[2] = { time: origPoints[2].time, price: origPoints[0].price + newOffsetPrice };
            newPoints[1] = { time, price: origPoints[1].price };
          } else if (idx === 11) {
            // Bottom-middle: shift channel width uniformly
            const origMidY = (origP1Y + origP2Y) / 2 + origOffsetY;
            const newMidY = coord.priceToY(price);
            if (newMidY === null) return;
            const deltaY = newMidY - origMidY;
            const newP3Price = coord.yToPrice(origP3Y + deltaY);
            if (newP3Price === null) return;
            newPoints[2] = { ...origPoints[2], price: newP3Price };
          } else if (idx === 13) {
            // Top-middle: shift top line uniformly (move p1 and p2 vertically)
            const origMidY = (origP1Y + origP2Y) / 2;
            const newMidY = coord.priceToY(price);
            if (newMidY === null) return;
            const deltaY = newMidY - origMidY;
            const newP1Price = coord.yToPrice(origP1Y + deltaY);
            const newP2Price = coord.yToPrice(origP2Y + deltaY);
            if (newP1Price === null || newP2Price === null) return;
            newPoints[0] = { ...origPoints[0], price: newP1Price };
            newPoints[1] = { ...origPoints[1], price: newP2Price };
          }
          updateDrawing(selected.id, { ...selected, points: newPoints });
        } else if ((selected.type === 'longposition' || selected.type === 'shortposition') && idx === 20) {
          // Virtual anchor for stop loss line - update props.stopPrice
          updateDrawing(selected.id, {
            ...selected,
            props: { ...selected.props, stopPrice: price },
          });
        } else {
          const newPoints = dragStartRef.current.points.map((p, i) => {
            if (i === idx) return { time, price };
            return { ...p };
          });
          updateDrawing(selected.id, { ...selected, points: newPoints });
        }
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

    // Preview with Shift-snap
    if (pendingPointsRef.current.length > 0 && drawingTool !== 'cursor') {
      let previewPt = { time, price };
      if (pendingPointsRef.current.length === 1 && ['trendline', 'ray', 'extendedline', 'infoline', 'trendangle'].includes(drawingTool)) {
        previewPt = snapAngle45(pendingPointsRef.current[0], previewPt);
      }
      previewPointRef.current = previewPt;
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
    // Finalize area selection
    if (areaSelectStartRef.current && areaSelectEndRef.current) {
      const s = areaSelectStartRef.current;
      const e = areaSelectEndRef.current;
      const minX = Math.min(s.x, e.x);
      const maxX = Math.max(s.x, e.x);
      const minY = Math.min(s.y, e.y);
      const maxY = Math.max(s.y, e.y);

      // Only select if dragged more than 5px (not just a click)
      if (Math.abs(e.x - s.x) > 5 || Math.abs(e.y - s.y) > 5) {
        const coord = getCoordHelper();
        if (coord) {
          const newSelected = new Set<string>();
          for (const d of chartDrawings) {
            const anchors = getAnchors(d, coord);
            const anyInside = anchors.some(a => a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY);
            if (anyInside) {
              newSelected.add(d.id);
            }
          }
          if (newSelected.size > 0) {
            setSelectedDrawingIds(newSelected);
            const firstId = [...newSelected][0];
            setSelectedDrawingId(firstId);
            for (const dd of drawings) {
              const shouldSelect = newSelected.has(dd.id);
              if (dd.selected !== shouldSelect) {
                updateDrawing(dd.id, { ...dd, selected: shouldSelect });
              }
            }
          }
        }
      }

      areaSelectStartRef.current = null;
      areaSelectEndRef.current = null;
    }

    isDraggingRef.current = false;
    dragStartRef.current = null;
    dragAnchorIdxRef.current = -1;
    if (isBrushingRef.current) {
      isBrushingRef.current = false;
      brushDrawingIdRef.current = null;
      setDrawingTool('cursor');
    }
  }, [chartDrawings, drawings, getCoordHelper, setSelectedDrawingId, setSelectedDrawingIds, updateDrawing, setDrawingTool]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Double-click on text/note drawing → open settings for editing
    if (drawingTool === 'cursor' || drawingTool === 'dot' || drawingTool === 'arrow_cursor') {
      const coords = getMouseCoords(e as unknown as MouseEvent);
      const coord = getCoordHelper();
      const container = containerRef.current;
      if (coords && coord && container) {
        const { mx, my } = coords;
        const w = container.clientWidth;
        const h = container.clientHeight;
        for (let i = chartDrawings.length - 1; i >= 0; i--) {
          const d = chartDrawings[i];
          if ((d.type === 'text' || d.type === 'note') && hitTestDrawing(d, mx, my, coord, w, h)) {
            setSettingsDrawingId(d.id);
            return;
          }
        }
      }
    }

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
  }, [drawingTool, addDrawing, setDrawingTool, chartDrawings, getMouseCoords, getCoordHelper, containerRef]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      shiftKeyRef.current = e.shiftKey;
      ctrlKeyRef.current = e.ctrlKey || e.metaKey;
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        // Delete all selected (multi + single)
        const allSelected = new Set(selectedDrawingIds);
        if (selectedDrawingId) allSelected.add(selectedDrawingId);
        if (allSelected.size > 0) {
          for (const id of allSelected) {
            const d = drawings.find(dd => dd.id === id);
            if (d && !d.locked) removeDrawing(id);
          }
          setSelectedDrawingId(null);
          setSelectedDrawingIds(new Set());
          setToolbarPos(null);
        }
      }
      if (e.key === 'Escape') {
        if (pendingPointsRef.current.length > 0) {
          pendingPointsRef.current = [];
          previewPointRef.current = null;
        }
        if (selectedDrawingId || selectedDrawingIds.size > 0) {
          for (const dd of drawings) {
            if (dd.selected) updateDrawing(dd.id, { ...dd, selected: false });
          }
          setSelectedDrawingId(null);
          setSelectedDrawingIds(new Set());
          setToolbarPos(null);
        }
      }
      // Ctrl+Z / Ctrl+Y undo/redo for drawings
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoDrawing();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoDrawing();
        return;
      }
      // Alt+V shortcut for vertical line
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        setDrawingTool('verticalline');
      }
    };
    const upHandler = (e: KeyboardEvent) => { shiftKeyRef.current = e.shiftKey; ctrlKeyRef.current = e.ctrlKey || e.metaKey; };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', upHandler);
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', upHandler); };
  }, [selectedDrawingId, selectedDrawingIds, drawings, removeDrawing, setSelectedDrawingId, setSelectedDrawingIds, updateDrawing, undoDrawing, redoDrawing]);

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

  const shouldCapturePointer = !isCursorMode || selectedDrawingId !== null || selectedDrawingIds.size > 0 || isHoveringDrawing;

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
      {(selectedDrawingId || selectedDrawingIds.size > 0) && toolbarPos && (
        <FloatingToolbar
          x={toolbarPos.x}
          y={toolbarPos.y}
          drawing={selectedDrawingId ? drawings.find(d => d.id === selectedDrawingId) || null : null}
          selectedCount={Math.max(selectedDrawingIds.size, selectedDrawingId ? 1 : 0)}
          onUpdate={(updates) => {
            // Apply to all selected drawings
            const allIds = new Set(selectedDrawingIds);
            if (selectedDrawingId) allIds.add(selectedDrawingId);
            for (const id of allIds) {
              const d = drawings.find(dd => dd.id === id);
              if (d) {
                const finalUpdates = { ...updates };
                // When color changes on a channel tool, also update channel level colors
                if (finalUpdates.color && d.type === 'parallelchannel' && d.props?.channelLevels) {
                  finalUpdates.props = {
                    ...d.props,
                    ...finalUpdates.props,
                    channelLevels: d.props.channelLevels.map((l: any) => ({ ...l, color: finalUpdates.color })),
                  };
                }
                updateDrawing(d.id, { ...d, ...finalUpdates });
              }
            }
          }}
          onClone={() => {
            const allIds = new Set(selectedDrawingIds);
            if (selectedDrawingId) allIds.add(selectedDrawingId);
            for (const id of allIds) {
              const d = drawings.find(dd => dd.id === id);
              if (d) {
                const clone: Drawing = {
                  ...d,
                  id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  points: d.points.map(p => ({ ...p })),
                  selected: false,
                };
                addDrawing(clone);
              }
            }
          }}
          onDelete={() => {
            const allIds = new Set(selectedDrawingIds);
            if (selectedDrawingId) allIds.add(selectedDrawingId);
            for (const id of allIds) removeDrawing(id);
            setSelectedDrawingId(null);
            setSelectedDrawingIds(new Set());
            setToolbarPos(null);
          }}
          onOpenSettings={() => { if (selectedDrawingId) setSettingsDrawingId(selectedDrawingId); }}
        />
      )}
      <DrawingContextMenu
        open={!!drawingCtxMenu}
        position={drawingCtxMenu || { x: 0, y: 0 }}
        drawing={ctxDrawing}
        onClose={() => setDrawingCtxMenu(null)}
        onUpdate={(updates) => {
          if (ctxDrawing) {
            const fu = { ...updates };
            if (fu.color && ctxDrawing.type === 'parallelchannel' && ctxDrawing.props?.channelLevels) {
              fu.props = { ...ctxDrawing.props, ...fu.props, channelLevels: ctxDrawing.props.channelLevels.map((l: any) => ({ ...l, color: fu.color })) };
            }
            updateDrawing(ctxDrawing.id, { ...ctxDrawing, ...fu });
          }
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
