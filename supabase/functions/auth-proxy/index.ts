import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SELF_HOSTED_URL = Deno.env.get("SELF_HOSTED_SUPABASE_URL");
  const SELF_HOSTED_ANON = Deno.env.get("SELF_HOSTED_ANON_KEY");

  if (!SELF_HOSTED_URL || !SELF_HOSTED_ANON) {
    return new Response(
      JSON.stringify({ error: "Self-hosted Supabase not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, email, password, access_token } = body;

    let targetUrl: string;
    let fetchOptions: RequestInit;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: SELF_HOSTED_ANON,
    };

    if (action === "signup") {
      targetUrl = `${SELF_HOSTED_URL}/auth/v1/signup`;
      fetchOptions = {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password }),
      };
    } else if (action === "signin") {
      targetUrl = `${SELF_HOSTED_URL}/auth/v1/token?grant_type=password`;
      fetchOptions = {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password }),
      };
    } else if (action === "signout") {
      headers["Authorization"] = `Bearer ${access_token}`;
      targetUrl = `${SELF_HOSTED_URL}/auth/v1/logout`;
      fetchOptions = {
        method: "POST",
        headers,
      };
    } else if (action === "get_user") {
      headers["Authorization"] = `Bearer ${access_token}`;
      targetUrl = `${SELF_HOSTED_URL}/auth/v1/user`;
      fetchOptions = {
        method: "GET",
        headers,
      };
    } else if (action === "refresh") {
      targetUrl = `${SELF_HOSTED_URL}/auth/v1/token?grant_type=refresh_token`;
      fetchOptions = {
        method: "POST",
        headers,
        body: JSON.stringify({ refresh_token: body.refresh_token }),
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.text();

    return new Response(responseData, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
