# Vizion Charts

A professional TradingView-style charting platform built with React, TypeScript, and Lightweight Charts.

## Features

- **Multi-Exchange Support** — Binance, Bybit, Coinbase, OKX, Kraken, KuCoin, Gate.io, MEXC, HTX, Bitget, Bitstamp
- **Advanced Drawing Tools** — Trendlines, channels, Fibonacci, patterns, shapes, text, notes, emojis, and more
- **90+ Technical Indicators** — MA, EMA, Bollinger Bands, RSI, MACD, and a full registry-based indicator system
- **Multi-Chart Layouts** — Split-screen with synced or independent panels
- **Watchlists** — Real-time price updates via WebSocket, multiple lists with sections
- **Chart Persistence** — Drawings, indicators, and settings saved per symbol per user
- **Replay Mode** — Step through historical price action bar by bar
- **Multiple Chart Types** — Candles, Heikin Ashi, Renko, Line Break, Kagi, Point & Figure, and more
- **Customizable Themes** — Multiple dark themes with full design token system
- **Authentication** — Email/password, Google OAuth, and guest mode

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Lightweight Charts v5
- Supabase (Lovable Cloud) for auth, database, and edge functions
- TanStack React Query
- Framer Motion

## Getting Started

This project is built and deployed via [Lovable](https://lovable.dev). To develop locally:

```bash
npm install
npm run dev
```

The app runs on `http://localhost:8080`.
