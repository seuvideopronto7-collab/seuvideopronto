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

    // 2) VOZ PRO (3 camadas: ElevenLabs → OpenAI → erro)
    // Nova função generate-voice retorna áudio persistido em bucket público.
    let audioUrl = "";
    let voiceProvider = "none";
    try {
      const voiceRes = await admin.functions.invoke("generate-voice", {
        body: {
          text: script,
          persist: true,
          jobId: `orch-${userId}-${Date.now()}`,
          emotion: objetivo, // vendas | autoridade | viral
        },
      });
      if (voiceRes.error) throw voiceRes.error;
      const vd = voiceRes.data as any;
      if (vd?.ok && vd.audioUrl) {
        audioUrl = vd.audioUrl;
        voiceProvider = vd.provider ?? "unknown";
        attempts.voice = { ok: true, provider: voiceProvider, bytes: vd.bytes };
      } else {
        throw new Error(vd?.error || "voice_no_url");
      }
    } catch (e) {
      voiceProvider = "failed";
      attempts.voice = { ok: false, error: (e as Error).message };
    }

    // 3) TRILHA — CDN online (Pixabay), sem MP3 local
    const trilhaMap: Record<string, string> = {
      vendas: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_115b9b6c4c.mp3",
      autoridade: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946f5e7c6e.mp3",
      viral: "https://cdn.pixabay.com/download/audio/2023/03/20/audio_5f1b64fcb7.mp3",
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
