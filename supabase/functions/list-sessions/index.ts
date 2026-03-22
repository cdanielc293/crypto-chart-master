import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sessions, error } = await adminClient.rpc("get_user_sessions", { p_user_id: user.id });

    if (error) {
      console.error("RPC error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enriched = (sessions || []).map((s: any) => {
      const parsed = parseUserAgent(s.user_agent || "");
      return {
        id: s.session_id,
        created_at: s.created_at,
        updated_at: s.updated_at,
        refreshed_at: s.refreshed_at,
        ip: s.ip || "Unknown",
        ...parsed,
      };
    });

    return new Response(JSON.stringify({ sessions: enriched, user_id: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseUserAgent(ua: string) {
  let device = "PC", os = "Unknown", browser = "Unknown";

  if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/Android.*Mobile/i.test(ua)) device = "Mobile";
  else if (/Android/i.test(ua)) device = "Tablet";
  else if (/Macintosh/i.test(ua)) device = "Mac";

  if (/Windows NT 10/i.test(ua)) os = "Windows 10";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X ([\d_]+)/i.test(ua)) { os = "Mac OS X " + (ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || ""); }
  else if (/iPhone OS ([\d_]+)/i.test(ua)) { os = "iOS " + (ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, ".") || ""); }
  else if (/Android ([\d.]+)/i.test(ua)) { os = "Android " + (ua.match(/Android ([\d.]+)/i)?.[1] || ""); }
  else if (/Linux/i.test(ua)) os = "Linux";

  if (/Edg\/([\d.]+)/i.test(ua)) browser = "Edge " + (ua.match(/Edg\/([\d.]+)/i)?.[1] || "");
  else if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome " + (ua.match(/Chrome\/([\d.]+)/i)?.[1] || "");
  else if (/Safari\/([\d.]+)/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari " + (ua.match(/Version\/([\d.]+)/i)?.[1] || "");
  else if (/Firefox\/([\d.]+)/i.test(ua)) browser = "Firefox " + (ua.match(/Firefox\/([\d.]+)/i)?.[1] || "");

  return { device, os, browser };
}
