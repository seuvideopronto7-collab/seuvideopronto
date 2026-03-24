import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type KiwifyPayload = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    external_id?: string;
  };
  product?: {
    name?: string;
    id?: string;
  };
  purchase?: {
    id?: string;
    price?: number;
    value?: number;
    status?: string;
  };
  status?: string;
  order_id?: string;
};

const getPayload = async (req: Request) => {
  const contentType = req.headers.get("content-type") || "";
  const raw = await req.text();
  if (!raw) return {};

  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const payload = params.get("payload");
    if (payload) return JSON.parse(payload);
    return Object.fromEntries(params.entries());
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const getWebhookToken = (req: Request) => {
  const headerToken =
    req.headers.get("x-kiwify-secret") ||
    req.headers.get("x-webhook-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerToken?.trim() || "";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, ok: false, error: "Method not allowed" }), {
        status: 200,
        headers,
      });
    }

    const payload = (await getPayload(req)) as KiwifyPayload;
    const secret = Deno.env.get("KIWIFY_WEBHOOK_SECRET") || "";
    if (secret && getWebhookToken(req) !== secret) {
      console.warn("Kiwify webhook token mismatch");
      return new Response(JSON.stringify({ success: false, ok: false, error: "unauthorized" }), {
        status: 200,
        headers,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      console.error("Supabase env vars not configured");
      return new Response(JSON.stringify({ success: false, ok: false, error: "server_not_configured" }), {
        status: 200,
        headers,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const customer = payload.customer || {};
    const product = payload.product || {};
    const purchase = payload.purchase || {};
    const status = payload.status || purchase.status || "unknown";
    const externalId = payload.order_id || purchase.id || customer.external_id || null;
    const valor = purchase.price ?? purchase.value ?? null;

    const venda = {
      user_id: null,
      external_id: externalId,
      origem: "kiwify",
      nome_cliente: customer.name || "",
      email: customer.email || "",
      produto: product.name || "",
      valor,
      status,
      raw_payload: payload,
    };

    const insertQuery = externalId
      ? supabase.from("vendas").upsert(venda, { onConflict: "external_id" })
      : supabase.from("vendas").insert(venda);

    const { error } = await insertQuery;
    if (error) {
      console.error("Erro ao salvar venda:", error.message);
      return new Response(JSON.stringify({ success: false, ok: false, error: "db_error" }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true, ok: true }), { status: 200, headers });
  } catch (err) {
    console.error("Erro webhook:", err);
    return new Response(JSON.stringify({ success: false, ok: false, error: "unexpected" }), {
      status: 200,
      headers,
    });
  }
});
