Self-hosted Supabase charting app with Binance data, dark theme, Hebrew-speaking user.
- Supabase self-hosted via Cloudflare Tunnel: https://marijuana-grove-fortune-learn.trycloudflare.com
- Client in src/integrations/supabase/client.ts
- Service role key is PRIVATE - must be stored as secret, never in codebase
- Drawing engine: Canvas overlay in src/lib/drawing/ (types, math, renderers, hit-testing, snap)
- DrawingCanvas component handles all mouse interaction, selection, dragging
- FloatingToolbar shows for selected drawings (color, width, lock, clone, delete)
- ChartContext has updateDrawing, selectedDrawingId, setSelectedDrawingId
- User wants professional TradingView-level quality
- User plans: auth system, payments, kline caching in DB, self-hosted deployment from GitHub
