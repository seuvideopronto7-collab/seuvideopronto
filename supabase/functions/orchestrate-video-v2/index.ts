// Orquestrador V2 — Copy → Voz → Trilha → pronto pra render no front
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
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // valida usuário
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const produto = String(body.produto ?? "").trim();
    const nicho = String(body.nicho ?? "geral").trim();
    const estilo = String(body.estilo ?? "vsl_agressivo").trim();
    const objetivo = String(body.objetivo ?? "vendas").trim() as "vendas" | "autoridade" | "viral";

    if (!produto) return json({ error: "produto é obrigatório" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const attempts: Record<string, unknown> = {};

    // 1) COPY V2
    let script = "";
    try {
      const copyRes = await admin.functions.invoke("generate-script-v2", {
        body: { produto, nicho, estilo, variacoes: 1 },
      });
      if (copyRes.error) throw copyRes.error;
      const results = (copyRes.data as any)?.results;
      script = results?.[0]?.fullScript ?? "";
      attempts.copy = { ok: true, len: script.length };
    } catch (e) {
      attempts.copy = { ok: false, error: (e as Error).message };
    }

    // fallback de copy: monta um script simples
    if (!script || script.length < 40) {
      script =
        `Você ainda não conhece ${produto}? ` +
        `A solução em ${nicho} que está mudando vidas. ` +
        `Resultados reais, sem enrolação. ` +
        `Aproveite agora antes que esgote. ` +
        `Clique no link e garanta o seu hoje mesmo.`;
      attempts.copy_fallback = true;
    }

    // 2) VOZ V2 (3 camadas: ElevenLabs → OpenAI → fallback local MP3)
    let audioUrl = "/audio/voz-padrao.mp3";
    let voiceProvider = "fallback_local";
    try {
      const voiceRes = await admin.functions.invoke("generate-voiceover-v2", {
        body: { text: script, jobId: `orch-${userId}-${Date.now()}` },
      });
      if (voiceRes.error) throw voiceRes.error;
      const vd = voiceRes.data as any;
      if (vd?.ok && vd.audioUrl && vd.audioUrl !== "__browser_tts__") {
        audioUrl = vd.audioUrl;
        voiceProvider = vd.provider ?? "unknown";
      } else {
        audioUrl = "/audio/voz-padrao.mp3";
        voiceProvider = "fallback_local";
      }
      attempts.voice = { ok: true, provider: voiceProvider };
    } catch (e) {
      audioUrl = "/audio/voz-padrao.mp3";
      voiceProvider = "fallback_local";
      attempts.voice = { ok: false, error: (e as Error).message };
    }

    // 3) TRILHA — local pré-gravada por objetivo
    const trilhaMap: Record<string, string> = {
      vendas: "/audio/trilha-vendas.mp3",
      autoridade: "/audio/trilha-autoridade.mp3",
      viral: "/audio/trilha-viral.mp3",
    };
    const trilha = trilhaMap[objetivo] ?? trilhaMap.vendas;

    return json({
      ok: true,
      script,
      audioUrl,
      voiceProvider,
      trilha,
      attempts,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
