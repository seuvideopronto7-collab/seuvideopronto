import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const getHottok = (req: Request, payload: any): string => {
  const fromHeader =
    req.headers.get("x-hotmart-hottok") ||
    req.headers.get("x-hottok") ||
    req.headers.get("hottok") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (fromHeader) return fromHeader.trim();
  return String(payload?.hottok ?? payload?.data?.hottok ?? "").trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("HOTMART_HOTTOK") || Deno.env.get("HOTMART_WEBHOOK_SECRET") || "";

  // Require the secret to be configured server-side; never accept events otherwise
  if (!expectedToken) {
    console.error("[hotmart-webhook] missing HOTMART_HOTTOK secret");
    return json({ error: "server_misconfigured" }, 500);
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const provided = getHottok(req, payload);
  if (!provided || provided !== expectedToken) {
    console.warn("[hotmart-webhook] unauthorized: token mismatch");
    return json({ error: "unauthorized" }, 401);
  }

  try {
    // Authenticated event accepted. Do not log full payload (PII).
    console.log("[hotmart-webhook] event accepted:", payload?.event ?? payload?.type ?? "unknown");
    return json({ success: true, received: true }, 200);
  } catch {
    return json({ error: "handler_error" }, 500);
  }
});
