import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ─── MANDATORY AUTH ──────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!supabaseUrl || !anonKey || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: responseHeaders,
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: responseHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    // Only use server-side credential — never accept client-supplied basicAuth
    const basicAuth = Deno.env.get("HOTMART_BASIC_AUTH");

    if (!basicAuth) {
      return new Response(
        JSON.stringify({ success: false, status: "erro", erro: "HOTMART_BASIC_AUTH not configured" }),
        { status: 500, headers: responseHeaders },
      );
    }

    const response = await fetch("https://api-sec-vlc.hotmart.com/security/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json().catch(() => ({}));

    if (data?.access_token) {
      // Do NOT return the access_token to the caller — it grants full Hotmart API access
      return new Response(
        JSON.stringify({ success: true, status: "conectado" }),
        { status: 200, headers: responseHeaders },
      );
    }

    return new Response(
      JSON.stringify({ success: false, status: "erro" }),
      { status: 502, headers: responseHeaders },
    );
  } catch (_e) {
    return new Response(
      JSON.stringify({ success: false, status: "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
