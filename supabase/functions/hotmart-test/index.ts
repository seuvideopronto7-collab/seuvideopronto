import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: "Supabase env not configured." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não autenticado." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: integration, error: integrationError } = await adminClient
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("platform", "hotmart")
      .maybeSingle();

    if (integrationError || !integration?.access_token) {
      return new Response(JSON.stringify({ success: false, error: "Integração Hotmart não encontrada." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const validateResponse = await fetch("https://api.hotmart.com/user/api/v1/user", {
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
      },
    });

    const status = validateResponse.ok ? "connected" : "error";
    await adminClient
      .from("integrations")
      .update({ status })
      .eq("user_id", user.id)
      .eq("platform", "hotmart");

    if (!validateResponse.ok) {
      return new Response(JSON.stringify({ success: false, status: "error" }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, status: "connected" }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
