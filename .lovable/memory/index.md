TradingView-style charting app with Binance data, dark theme, Hebrew-speaking user.
- Backend: Lovable Cloud (migrated from self-hosted Supabase)
- Auth: Google + Apple OAuth via lovable.auth.signInWithOAuth
- Drawing engine: Canvas overlay in src/lib/drawing/ (types, math, renderers, hit-testing, snap)
- DrawingCanvas component handles all mouse interaction, selection, dragging
- FloatingToolbar shows for selected drawings (color, width, lock, clone, delete)
- Drawing type extended with lineWidth, selected, visible, locked, props fields
- ChartContext has updateDrawing, selectedDrawingId, setSelectedDrawingId
- User wants professional TradingView-level quality
- klines table in Lovable Cloud for Binance kline caching
