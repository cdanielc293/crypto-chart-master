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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query auth.sessions via PostgREST with service role using the auth schema
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    
    // Use REST API to query auth schema
    const restUrl = `${supabaseUrl}/rest/v1/sessions?user_id=eq.${user.id}&order=updated_at.desc&select=id,created_at,updated_at,ip,user_agent,refreshed_at`;
    const response = await fetch(restUrl, {
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Accept": "application/json",
        "Accept-Profile": "auth",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("REST query error:", response.status, errorText);
      
      // Fallback: return current session info from the JWT
      return new Response(JSON.stringify({ 
        sessions: [{
          id: "current",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "Unknown",
          device: "PC",
          os: "Unknown",
          browser: "Unknown",
        }],
        user_id: user.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessions = await response.json();

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

  if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/Android.*Mobile/i.test(ua)) device = "Mobile";
  else if (/Android/i.test(ua)) device = "Tablet";
  else if (/Macintosh/i.test(ua)) device = "Mac";

  if (/Windows NT 10/i.test(ua)) os = "Windows 10";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_]+)/i);
    os = "Mac OS X " + (match?.[1]?.replace(/_/g, ".") || "");
  } else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/i);
    os = "iOS " + (match?.[1]?.replace(/_/g, ".") || "");
  } else if (/Android ([\d.]+)/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/i);
    os = "Android " + (match?.[1] || "");
  } else if (/Linux/i.test(ua)) os = "Linux";

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
