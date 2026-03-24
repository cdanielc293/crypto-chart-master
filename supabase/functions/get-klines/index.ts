import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan-based bar limits (must stay in sync with frontend planLimits.ts)
const PLAN_BARS: Record<string, number> = {
  start: 6000,
  core: 10000,
  prime: 10000,
  elite: 20000,
  zenith: 40000,
};

const INTERVAL_SECONDS: Record<string, number> = {
  "1s": 1, "5s": 5, "10s": 10, "15s": 15, "30s": 30, "45s": 45,
  "1m": 60, "2m": 120, "3m": 180, "5m": 300, "10m": 600,
  "15m": 900, "30m": 1800, "45m": 2700,
  "1h": 3600, "2h": 7200, "3h": 10800, "4h": 14400,
  "1d": 86400, "1w": 604800, "1M": 2592000,
  "3M": 7776000, "6M": 15552000, "12M": 31104000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user plan
    const { data: profile } = await adminClient
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    const plan = (profile?.plan || "start").toLowerCase();
    const maxBars = PLAN_BARS[plan] || PLAN_BARS.start;

    // Parse request
    const { symbol, interval, before, limit } = await req.json();
    if (!symbol || !interval) {
      return new Response(JSON.stringify({ error: "symbol and interval required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate earliest allowed timestamp
    const intervalSec = INTERVAL_SECONDS[interval] || 86400;
    const depthSec = maxBars * intervalSec;
    const nowSec = Math.floor(Date.now() / 1000);
    const earliestAllowed = nowSec - depthSec;

    // Build query
    const fetchLimit = Math.min(limit || 1000, maxBars, 5000);
    let query = adminClient
      .from("klines")
      .select("*")
      .eq("symbol", symbol)
      .eq("interval", interval)
      .gte("time", earliestAllowed)
      .order("time", { ascending: false })
      .limit(fetchLimit);

    if (before) {
      query = query.lt("time", before);
    }

    const { data: klines, error } = await query;
    if (error) {
      console.error("Klines query error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch klines" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return sorted ascending
    const sorted = (klines || []).sort((a: any, b: any) => a.time - b.time);

    return new Response(
      JSON.stringify({
        klines: sorted,
        plan,
        max_bars: maxBars,
        earliest_allowed: earliestAllowed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
