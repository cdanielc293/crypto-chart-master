# Memory: index.md
Updated: now

TradingView-style charting app with Binance data, dark theme, Hebrew-speaking user.
- Drawing engine: Canvas overlay in src/lib/drawing/ (types, math, renderers, hit-testing, snap)
- DrawingCanvas component handles all mouse interaction, selection, dragging
- FloatingToolbar shows for selected drawings (color, width, lock, clone, delete)
- Drawing type extended with lineWidth, selected, visible, locked, props fields
- ChartContext has updateDrawing, selectedDrawingId, setSelectedDrawingId
- User wants professional TradingView-level quality
- Indicator system: registry-based in src/lib/indicators/registry.ts with 60+ indicators
- Indicators use unique instance IDs (definitionId_timestamp), allowing multiple of same type
- ChartContext has addIndicator/removeIndicator (not toggleIndicator for new system)
- Volume indicator is NOT shown by default - only when explicitly added
- IndicatorInstance type in src/types/indicators.ts with params + lineStyles
