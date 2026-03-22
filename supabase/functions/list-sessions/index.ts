import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to get their user id
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to query auth.sessions
    const adminClient = createClient(supabaseUrl, supabaseKey, {
      db: { schema: "auth" },
    });

    const { data: sessions, error: sessionsError } = await adminClient
      .from("sessions")
      .select("id, created_at, updated_at, ip, user_agent, refreshed_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (sessionsError) {
      console.error("Sessions query error:", sessionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current session id from token
    const { data: { session: currentSession } } = await userClient.auth.getSession();
    const currentSessionId = currentSession?.access_token
      ? undefined // We'll mark by matching IP + user_agent of the request
      : undefined;

    // Parse user agents and enrich session data
    const enrichedSessions = (sessions || []).map((s: any) => {
      const ua = s.user_agent || "";
      const parsed = parseUserAgent(ua);
      return {
        id: s.id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        refreshed_at: s.refreshed_at,
        ip: s.ip || "Unknown",
        ...parsed,
        raw_user_agent: ua,
      };
    });

    return new Response(JSON.stringify({ sessions: enrichedSessions, user_id: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseUserAgent(ua: string) {
  let device = "PC";
  let os = "Unknown";
  let browser = "Unknown";

  // Device type
  if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/Android.*Mobile/i.test(ua)) device = "Mobile";
  else if (/Android/i.test(ua)) device = "Tablet";
  else if (/Macintosh/i.test(ua)) device = "Mac";

  // OS
  if (/Windows NT 10/i.test(ua)) os = "Windows 10";
  else if (/Windows NT 11/i.test(ua)) os = "Windows 11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_]+)/i);
    os = "Mac OS X " + (match?.[1]?.replace(/_/g, ".") || "");
  } else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/i);
    os = "iOS " + (match?.[1]?.replace(/_/g, ".") || "");
  } else if (/iPad.*OS ([\d_]+)/i.test(ua)) {
    const match = ua.match(/OS ([\d_]+)/i);
    os = "iOS " + (match?.[1]?.replace(/_/g, ".") || "");
  } else if (/Android ([\d.]+)/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/i);
    os = "Android " + (match?.[1] || "");
  } else if (/Linux/i.test(ua)) os = "Linux";

  // Browser
  if (/Edg\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/i);
    browser = "Edge " + (match?.[1] || "");
  } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/i);
    browser = "Chrome " + (match?.[1] || "");
  } else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const vMatch = ua.match(/Version\/([\d.]+)/i);
    browser = "Safari " + (vMatch?.[1] || "");
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/i);
    browser = "Firefox " + (match?.[1] || "");
  }

  return { device, os, browser };
}
