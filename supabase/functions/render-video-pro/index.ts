// Render PRO via Shotstack — para planos pro/premium
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("SHOTSTACK_API_KEY");
    if (!apiKey) return json({ error: "SHOTSTACK_API_KEY missing" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    // Plan must come from server-side subscription, never trust client body
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const plan = (sub?.plan ?? "free").toLowerCase();
    if (plan !== "pro" && plan !== "premium") {
      return json({ error: "plan_required", message: "PRO or PREMIUM required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const script = String(body.script ?? "").trim();
    const audioUrl = String(body.audioUrl ?? "").trim();
    const trilha = String(body.trilha ?? "").trim();

    if (!script) return json({ error: "script obrigatório" }, 400);

    const resolution = plan === "premium" ? "1080" : "720";

    // Timeline simples: title overlay + voz + trilha
    const tracks: any[] = [
      {
        clips: [
          {
            asset: { type: "title", text: script.slice(0, 200), style: "minimal" },
            start: 0,
            length: 12,
            transition: { in: "fade", out: "fade" },
          },
        ],
      },
    ];

    if (audioUrl && audioUrl.startsWith("http")) {
      tracks.push({
        clips: [{ asset: { type: "audio", src: audioUrl, volume: 1 }, start: 0, length: 12 }],
      });
    }
    if (trilha && trilha.startsWith("http")) {
      tracks.push({
        clips: [{ asset: { type: "audio", src: trilha, volume: 0.18 }, start: 0, length: 12 }],
      });
    }

    const preferredEnv = (Deno.env.get("SHOTSTACK_ENV") || "stage").toLowerCase() === "v1" ? "v1" : "stage";
    const envOrder = preferredEnv === "v1" ? ["v1", "stage"] : ["stage", "v1"];
    let renderRes: Response | null = null;
    let renderData: any = null;
    let lastStatus = 0;
    for (const env of envOrder) {
      const r = await fetch(`https://api.shotstack.io/edit/${env}/render`, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          timeline: { background: "#0B0F14", tracks },
          output: { format: "mp4", resolution, aspectRatio: "9:16" },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { renderRes = r; renderData = data; break; }
      lastStatus = r.status;
      renderData = data;
      if (r.status !== 401 && r.status !== 403) break;
    }
    if (!renderRes) {
      return json({ error: "shotstack failed", status: lastStatus, detail: renderData }, 500);
    }

    return json({
      ok: true,
      provider: "shotstack",
      renderId: renderData?.response?.id,
      message: "Render iniciado. Use renderId para consultar status.",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
