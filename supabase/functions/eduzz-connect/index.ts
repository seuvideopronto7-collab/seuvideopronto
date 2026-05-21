import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const clientId = body?.client_id?.trim();
    const clientSecret = body?.client_secret?.trim();
    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    console.log("Eduzz payload recebido:", { hasClientId: !!clientId, hasClientSecret: !!clientSecret });

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ success: false, error: "Informe client_id e client_secret." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

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

    const tokenRequestBody = {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    };

    // Never log the secret — log only that it's present
    console.log("Eduzz request:", {
      grant_type: "client_credentials",
      has_client_id: !!clientId,
      has_client_secret: !!clientSecret,
    });

    const tokenResponse = await fetch("https://api.eduzz.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequestBody),
    });

    const tokenResponseClone = tokenResponse.clone();
    const tokenRaw = await tokenResponseClone.text().catch(() => "");
    console.log("Eduzz response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("[eduzz-connect] token error:", tokenResponse.status, tokenRaw);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Falha na conexão com a Eduzz. Verifique credenciais, escopos e formato da requisição.",
        }),
        {
          status: 200,
          headers: responseHeaders,
        },
      );
    }

    const tokenData = (await tokenResponse.json()) as TokenResponse;
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, error: "Token de acesso não retornado pela Eduzz." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const validateResponse = await fetch("https://api.eduzz.com/my-account", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!validateResponse.ok) {
      const validateRaw = await validateResponse.text().catch(() => "");
      console.log("Eduzz validate failed status:", validateResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Falha na conexão com a Eduzz. Verifique credenciais, escopos e formato da requisição.",
          details: validateRaw,
        }),
        {
          status: 200,
          headers: responseHeaders,
        },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { error: upsertError } = await adminClient
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          platform: "eduzz",
          access_token: accessToken,
          status: "connected",
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" },
      );

    if (upsertError) {
      return new Response(JSON.stringify({ success: false, error: "Falha ao salvar integração." }), {
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
      JSON.stringify({
        success: false,
        error:
          "Falha na conexão com a Eduzz. Verifique credenciais, escopos e formato da requisição.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
