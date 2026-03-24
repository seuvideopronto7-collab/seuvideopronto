import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const basicAuth = body?.basicAuth || Deno.env.get("HOTMART_BASIC_AUTH");
    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    console.log("Hotmart basic auth recebido:", { hasBasicAuth: !!basicAuth });

    if (!basicAuth) {
      return new Response(
        JSON.stringify({ success: false, status: "erro", erro: "HOTMART_BASIC_AUTH not configured" }),
        {
          status: 200,
          headers: responseHeaders,
        },
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

    const data = await response.json();

    if (data?.access_token) {
      return new Response(JSON.stringify({ success: true, status: "conectado", token: data.access_token }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    return new Response(JSON.stringify({ success: false, status: "erro", detalhe: data }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        status: "erro",
        erro: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
