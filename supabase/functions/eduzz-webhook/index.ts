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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: "Supabase env not configured." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const payload = await req.json().catch(() => ({}));
    console.log("Eduzz webhook recebido:", payload);
    const externalId = payload?.id || payload?.sale_id || null;
    const email = payload?.customer?.email || payload?.email || "";
    const nome = payload?.customer?.name || payload?.nome || "";
    const produto = payload?.product?.name || payload?.produto || "";
    const valor = payload?.value || payload?.valor || null;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    await adminClient.from("vendas").insert({
      external_id: externalId,
      origem: "eduzz",
      nome_cliente: nome,
      email,
      produto,
      valor,
      status: "received",
      raw_payload: payload,
    });

    return new Response(JSON.stringify({ success: true, status: "ok" }), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
