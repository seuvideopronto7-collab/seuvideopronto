import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getToken = (req: Request, payload: any): string => {
  const fromHeader =
    req.headers.get("x-eduzz-token") ||
    req.headers.get("x-webhook-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (fromHeader) return fromHeader.trim();
  return String(payload?.token ?? payload?.webhook_token ?? "").trim();
};

const safeStr = (v: unknown, max = 500) =>
  typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max);

const safeNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expectedToken = Deno.env.get("EDUZZ_WEBHOOK_SECRET") || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }
  if (!expectedToken) {
    console.error("[eduzz-webhook] missing EDUZZ_WEBHOOK_SECRET");
    return json({ error: "server_misconfigured" }, 500);
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const provided = getToken(req, payload);
  if (!provided || provided !== expectedToken) {
    console.warn("[eduzz-webhook] unauthorized: token mismatch");
    return json({ error: "unauthorized" }, 401);
  }

  try {
    // Sanitize and whitelist the fields we persist; never store raw attacker input verbatim
    const externalId = safeStr(payload?.id || payload?.sale_id || "", 128) || null;
    const email = safeStr(payload?.customer?.email || payload?.email || "", 320);
    const nome = safeStr(payload?.customer?.name || payload?.nome || "", 200);
    const produto = safeStr(payload?.product?.name || payload?.produto || "", 200);
    const valor = safeNum(payload?.value ?? payload?.valor);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    await adminClient.from("vendas").insert({
      external_id: externalId,
      origem: "eduzz",
      nome_cliente: nome,
      email,
      produto,
      valor,
      status: "received",
      // Persist only sanitized snapshot, not arbitrary attacker payload
      raw_payload: { external_id: externalId, email, nome, produto, valor },
    });

    return json({ success: true, status: "ok" }, 200);
  } catch {
    return json({ error: "handler_error" }, 500);
  }
});
