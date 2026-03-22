import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-real-user-agent",
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

    // Get real IP from X-Forwarded-For or fallback
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("cf-connecting-ip") || "Unknown";

    // Get real User-Agent: prefer custom header, fallback to standard
    const realUserAgent = req.headers.get("x-real-user-agent") || req.headers.get("user-agent") || "Unknown";

    // Get the current session ID from the token
    // We need to find the session that matches this access token
    const { data: sessions } = await adminClient.rpc("get_user_sessions", { p_user_id: user.id });
    
    // The most recently updated session is likely the current one
    const currentSession = sessions?.[0];
    if (!currentSession) {
      return new Response(JSON.stringify({ error: "No active session found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert the device info
    const { error: upsertError } = await adminClient
      .from("session_devices")
      .upsert({
        user_id: user.id,
        session_id: currentSession.session_id,
        real_ip: realIp,
        real_user_agent: realUserAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,session_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to register device" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
