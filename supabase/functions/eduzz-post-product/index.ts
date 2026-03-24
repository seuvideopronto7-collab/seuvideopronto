import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type ProdutoPayload = {
  nome?: string;
  descricao?: string;
  preco?: number;
  tipo?: string;
  url_capa?: string;
  conteudo_url?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const produto = (body?.produto || {}) as ProdutoPayload;
    const responseHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    console.log("Eduzz produto payload:", produto);

    if (!produto?.nome || !produto?.descricao || !produto?.preco) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Informe nome, descricao e preco para publicar o produto.",
        }),
        {
          status: 200,
          headers: responseHeaders,
        },
      );
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: integration, error: integrationError } = await adminClient
      .from("integrations")
      .select("access_token")
      .eq("user_id", user.id)
      .eq("platform", "eduzz")
      .single();

    if (integrationError || !integration?.access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Integração Eduzz não encontrada ou expirada." }),
        {
          status: 200,
          headers: responseHeaders,
        },
      );
    }

    const payload = {
      name: produto.nome,
      description: produto.descricao,
      price: produto.preco,
      type: "DIGITAL",
      status: "ACTIVE",
    };

    console.log("Enviando produto:", produto);

    const eduzzResponse = await fetch("https://api.eduzz.com/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await eduzzResponse.text().catch(() => "");
    console.log("Resposta Eduzz:", { status: eduzzResponse.status, body: raw });

    if (!eduzzResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao publicar na Eduzz.",
          details: raw,
        }),
        {
          status: 200,
          headers: responseHeaders,
        },
      );
    }

    let parsed: any = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }

    const productId = parsed?.id || parsed?.data?.id || "";
    const checkoutUrl = parsed?.url || parsed?.data?.url || parsed?.link || "";

    const { error: insertError } = await adminClient.from("produtos_publicados").insert({
      user_id: user.id,
      product_id: productId,
      platform: "eduzz",
      link_checkout: checkoutUrl,
      status: "published",
    });

    if (insertError) {
      return new Response(JSON.stringify({ success: false, error: "Falha ao salvar publicação." }), {
        status: 200,
        headers: responseHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: productId,
        url: checkoutUrl,
      }),
      {
        status: 200,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro ao publicar na Eduzz.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
