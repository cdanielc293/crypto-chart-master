---
name: Backtest dual-source data architecture
description: Bar Replay uses Storage bucket + IndexedDB instead of DB for historical data. No plan-based bar limits in replay.
type: feature
---
- Replay/backtest data flows: IndexedDB → Edge Function (backtest-klines) → Storage bucket (chart-history) → Binance API fill
- Storage structure: {SYMBOL}/{interval}/{year}.csv in chart-history bucket
- Edge function: supabase/functions/backtest-klines/index.ts
- Client cache: src/lib/backtestCache.ts (IndexedDB + edge function)
- Classic chart: klineCache.ts loadKlinesForReplay() calls backtestCache first, DB fallback
- New UI chart: PriceChartWidget uses getBacktestKlines during replay, disables WS
- Time-sync: Unix timestamp preserved across interval changes via replayBarTimestampRef/replayStartTimestampRef
- No bar limits during replay — full historical access regardless of plan
- Live mode still uses DB (klines table, 40K retention)
