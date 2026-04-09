import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOUNDTRACK_PROMPTS: Record<string, string> = {
  vendas:
    "High-energy cinematic commercial soundtrack, modern advertising style, deep bass, punchy drums, motivational rhythm, epic build-up, clean digital synths, subtle vocal chops, premium brand feel, luxury vibe, high impact transitions, rising tension, powerful drops, emotional uplift, modern startup energy, confident and persuasive tone, suitable for product sales video, 100-120 BPM, crisp production, no lyrics, background music, engaging and dynamic.",
  vendas_agressiva:
    "Aggressive commercial soundtrack, strong bass, fast-paced beats, modern trap elements, intense build-up, energetic drops, persuasive and high-conversion tone, bold and confident, digital marketing ad style, high impact, no vocals.",
  autoridade:
    "Cinematic inspirational soundtrack, slow build, piano and ambient pads, soft percussion, emotional and trustworthy tone, premium corporate style, elegant and confident, suitable for personal branding and authority videos.",
  viral:
    "Trendy upbeat music, catchy rhythm, modern social media vibe, short loop friendly, light bass, energetic but fun, viral content style, engaging and dynamic, no vocals.",
};

/** Pick the right prompt based on objective + duration */
const buildMusicPrompt = (objective: string, durationSec: number): string => {
  const key = objective?.toLowerCase().replace(/\s+/g, "_") || "vendas";
  const base = SOUNDTRACK_PROMPTS[key] || SOUNDTRACK_PROMPTS.vendas;

  // Duration-aware additions
  const durationHint =
    durationSec <= 15
      ? " Start with high rhythm immediately, no slow intro, punchy from second one."
      : durationSec <= 30
        ? " Build-up in first 5 seconds then drop, maintain energy throughout."
        : " Start with build-up, strong drop at 15 seconds, increase intensity toward the end for CTA impact.";

  return base + durationHint;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      objective = "vendas",
      duration = 15,
      jobId,
    } = body;

    const durationSec = Math.max(5, Math.min(120, Number(duration) || 15));
    const prompt = buildMusicPrompt(objective, durationSec);

    console.log(`[generate-soundtrack] user=${user.id} objective=${objective} duration=${durationSec}s`);

    // Call ElevenLabs Music API
    const elRes = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        duration_seconds: durationSec,
      }),
    });

    if (!elRes.ok) {
      const errText = await elRes.text();
      console.error("[generate-soundtrack] ElevenLabs error:", elRes.status, errText);
      const isAuthError = elRes.status === 401;
      return new Response(JSON.stringify({
        ok: false,
        error: isAuthError
          ? "Chave da API de áudio inválida ou sem permissão para geração de música. Verifique as configurações."
          : `Erro na geração de trilha sonora (${elRes.status})`,
        detail: errText,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await elRes.arrayBuffer();
    console.log(`[generate-soundtrack] received ${audioBuffer.byteLength} bytes`);

    // Upload to storage
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const storagePath = `soundtracks/${jobId || user.id}/${Date.now()}.mp3`;
    const { error: uploadErr } = await admin.storage
      .from("audio")
      .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadErr) {
      console.error("[generate-soundtrack] upload error:", uploadErr);
      // Still return audio as binary fallback
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    const { data: pubData } = admin.storage.from("audio").getPublicUrl(storagePath);
    const audioUrl = pubData.publicUrl;

    console.log(`[generate-soundtrack] ✅ saved ${storagePath}`);

    return new Response(JSON.stringify({ audioUrl, prompt, duration: durationSec, objective }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-soundtrack] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
