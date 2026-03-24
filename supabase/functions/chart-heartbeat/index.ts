import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { tab_id, action } = body; // action: 'claim' | 'check'

    if (!tab_id) {
      return new Response(JSON.stringify({ error: "tab_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract real IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Get current active tab
    const { data: currentTab } = await supabase
      .from("user_active_tab")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let ipAlert = false;
    let previousIp: string | null = null;

    if (action === "claim") {
      // Check for IP change (only alert if different IP AND different tab)
      if (
        currentTab &&
        currentTab.ip_address &&
        currentTab.ip_address !== ip &&
        currentTab.tab_id !== tab_id
      ) {
        ipAlert = true;
        previousIp = currentTab.ip_address;

        // Log security alert for admin
        await supabase.from("security_alerts").insert({
          user_id: user.id,
          alert_type: "multi_ip",
          details: {
            previous_ip: currentTab.ip_address,
            new_ip: ip,
            previous_user_agent: currentTab.user_agent,
            new_user_agent: userAgent,
            previous_tab_id: currentTab.tab_id,
            new_tab_id: tab_id,
          },
        });
      }

      // Upsert - this tab becomes the active one
      await supabase.from("user_active_tab").upsert(
        {
          user_id: user.id,
          tab_id,
          ip_address: ip,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      return new Response(
        JSON.stringify({
          active: true,
          ip_alert: ipAlert,
          previous_ip: previousIp,
          current_ip: ip,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // action === 'check'
    const isActive = currentTab?.tab_id === tab_id;

    // If the stored IP differs from request IP, flag it
    if (currentTab && currentTab.ip_address && currentTab.ip_address !== ip) {
      ipAlert = true;
      previousIp = currentTab.ip_address;
    }

    return new Response(
      JSON.stringify({
        active: isActive,
        ip_alert: ipAlert,
        previous_ip: previousIp,
        current_ip: ip,
        disconnected_by: !isActive
          ? {
              ip: currentTab?.ip_address || null,
              user_agent: currentTab?.user_agent || null,
            }
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
