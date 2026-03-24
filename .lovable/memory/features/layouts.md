Layout system persists full workspace state to user_layouts DB table per user.
- Table: user_layouts (id, user_id, name, is_active, grid_layout_id, sync_options, panels jsonb, chart_settings, sort_order)
- Each layout stores panels array: per-panel symbol, interval, chartType, indicators, indicatorConfigs, hiddenIndicators, drawings
- LayoutManager.tsx handles CRUD with DB, autosave, rename, copy, delete
- Layouts restore grid layout, sync options, chart settings, and per-panel symbols on switch
- sendBeacon used for beforeunload save
- ChartLayout type in src/types/layout.ts uses snake_case matching DB columns
