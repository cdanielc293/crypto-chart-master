
-- 1. Drop redundant index (PK already covers symbol, interval, time)
DROP INDEX IF EXISTS idx_klines_symbol_interval_time;

-- 2. Set aggressive autovacuum on klines table
ALTER TABLE klines SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_vacuum_threshold = 1000,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500,
  autovacuum_vacuum_cost_delay = 5
);

-- 3. Create retention cleanup function (keeps max 40K rows per symbol+interval)
CREATE OR REPLACE FUNCTION public.cleanup_klines_retention(max_rows int DEFAULT 40000)
RETURNS TABLE(deleted_symbol text, deleted_interval text, rows_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH combos AS (
    SELECT k.symbol AS s, k.interval AS i, count(*) AS cnt
    FROM klines k
    GROUP BY k.symbol, k.interval
    HAVING count(*) > max_rows
  ),
  cutoffs AS (
    SELECT c.s, c.i, (
      SELECT k2.time FROM klines k2
      WHERE k2.symbol = c.s AND k2.interval = c.i
      ORDER BY k2.time DESC
      OFFSET max_rows
      LIMIT 1
    ) AS cutoff_time
    FROM combos c
  ),
  deleted AS (
    DELETE FROM klines k
    USING cutoffs ct
    WHERE k.symbol = ct.s
      AND k.interval = ct.i
      AND k.time <= ct.cutoff_time
    RETURNING k.symbol, k.interval
  )
  SELECT d.symbol, d.interval, count(*)::bigint
  FROM deleted d
  GROUP BY d.symbol, d.interval;
END;
$$;
