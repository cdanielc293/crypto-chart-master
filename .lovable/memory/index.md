# Memory: index.md
Updated: now

TradingView-style charting app with Binance data, dark theme, Hebrew-speaking user.
- Drawing engine: Canvas overlay in src/lib/drawing/ (types, math, renderers, hit-testing, snap)
- DrawingCanvas component handles all mouse interaction, selection, dragging
- FloatingToolbar shows for selected drawings (color, width, lock, clone, delete)
- Drawing type extended with lineWidth, selected, visible, locked, props fields
- ChartContext has updateDrawing, selectedDrawingId, setSelectedDrawingId
- User wants professional TradingView-level quality
- Multi-exchange: 11 crypto exchanges + Yahoo Finance (stocks, forex, indices)
- Yahoo Finance routed through edge function proxy (yahoo-proxy) to avoid CORS
- Symbol→exchange mapping in src/lib/exchanges/symbolRegistry.ts
- klineCache routes non-Binance symbols through exchange adapter fetchKlines
- Non-Binance symbols skip supabase cache/backfill, fetch directly from adapter
