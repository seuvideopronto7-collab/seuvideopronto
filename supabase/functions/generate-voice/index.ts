// Generate Voice — 3 camadas: ElevenLabs → OpenAI → erro estruturado
// Voz por EMOÇÃO (vendas/autoridade/viral) + CACHE por hash do (texto+emoção+provider)
// Retorna áudio binário (audio/mpeg) ou JSON {audioUrl} quando persist=true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-voice-provider, x-voice-bytes, x-voice-cache",
};

const TTS_TIMEOUT_MS = 20_000;

type Emotion = "vendas" | "autoridade" | "viral" | "neutro";

// Mapa por emoção — voice_id ElevenLabs + voice OpenAI + voice_settings
const EMOTION_MAP: Record<Emotion, {
  elevenVoiceId: string;
  elevenSettings: { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean; speed?: number };
  openaiVoice: string; // alloy, echo, fable, onyx, nova, shimmer
}> = {
  // urgente, agressivo, vende
  vendas: {
    elevenVoiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam — masculino energético
    elevenSettings: { stability: 0.35, similarity_boost: 0.85, style: 0.7, use_speaker_boost: true, speed: 1.08 },
    openaiVoice: "onyx",
  },
  // calma, confiante, especialista
  autoridade: {
    elevenVoiceId: "JBFqnCBsd6RMkjVDRZzb", // George — calmo profissional
    elevenSettings: { stability: 0.75, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.98 },
    openaiVoice: "echo",
  },
  // energético, jovem, hook
  viral: {
    elevenVoiceId: "Xb7hH8MSUJpSbSDYk0k2", // Alice — feminino vibrante
    elevenSettings: { stability: 0.3, similarity_boost: 0.85, style: 0.85, use_speaker_boost: true, speed: 1.12 },
    openaiVoice: "nova",
  },
  // padrão equilibrado
  neutro: {
    elevenVoiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah
    elevenSettings: { stability: 0.55, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 1.0 },
    openaiVoice: "alloy",
  },
};

function pickEmotion(input: unknown): Emotion {
  const v = String(input ?? "").toLowerCase();
  if (v === "vendas" || v === "autoridade" || v === "viral") return v;
  return "neutro";
}

// Hash determinístico (SHA-256 → hex curto) p/ chave de cache
async function hashKey(parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("|"));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function tryElevenLabs(text: string, emotion: Emotion): Promise<Uint8Array | null> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return null;
  const cfg = EMOTION_MAP[emotion];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: cfg.elevenSettings,
        }),
        signal: ctrl.signal,
      },
    );
    clearTimeout(t);
    if (!res.ok) {
      console.error(`[voice] eleven status=${res.status} body=${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 800) return null;
    return buf;
  } catch (e) {
    clearTimeout(t);
    console.error(`[voice] eleven error=${(e as Error).message}`);
    return null;
  }
}

async function tryOpenAI(text: string, emotion: Emotion): Promise<Uint8Array | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  const cfg = EMOTION_MAP[emotion];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: cfg.openaiVoice,
        input: text,
        response_format: "mp3",
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      console.error(`[voice] openai status=${res.status} body=${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 800) return null;
    return buf;
  } catch (e) {
    clearTimeout(t);
    console.error(`[voice] openai error=${(e as Error).message}`);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = Date.now();
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser();
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text ?? "").trim();
    const persist = body.persist === true;
    const jobId = body.jobId as string | undefined;
    const emotion = pickEmotion(body.emotion ?? body.objetivo);

    if (!text || text.length < 2) {
      return new Response(JSON.stringify({ error: "text obrigatório (min 2 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 🧠 CACHE: se persist=true, tenta achar MP3 já gerado para (text+emotion)
    // Caminho: voice/cache/{hash}.mp3 — reuso entre usuários é ok pois texto+emoção é o input
    const cacheHash = await hashKey([text, emotion]);
    const cachePath = `voice/cache/${cacheHash}.mp3`;

    if (persist) {
      try {
        const head = await admin.storage.from("audio").list("voice/cache", {
          search: `${cacheHash}.mp3`,
          limit: 1,
        });
        if (!head.error && head.data && head.data.some((f) => f.name === `${cacheHash}.mp3`)) {
          const { data: pub } = admin.storage.from("audio").getPublicUrl(cachePath);
          console.log(`[voice] CACHE HIT hash=${cacheHash} emotion=${emotion}`);
          return new Response(
            JSON.stringify({
              ok: true,
              provider: "cache",
              emotion,
              audioUrl: pub.publicUrl,
              cached: true,
              duration_ms: Date.now() - start,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Voice-Cache": "hit" } },
          );
        }
      } catch (e) {
        console.error(`[voice] cache lookup error=${(e as Error).message}`);
      }
    }

    // 1) ElevenLabs
    let provider = "elevenlabs";
    let audio = await tryElevenLabs(text, emotion);

    // 2) OpenAI
    if (!audio) {
      provider = "openai";
      audio = await tryOpenAI(text, emotion);
    }

    if (!audio) {
      console.error(`[voice] FAIL_ALL elapsed=${Date.now() - start}ms`);
      return new Response(
        JSON.stringify({ error: "all_providers_failed", attempts: ["elevenlabs", "openai"] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (persist) {
      try {
        // grava no cache (chave determinística) — futuras chamadas reusam
        const { error: upErr } = await admin.storage
          .from("audio")
          .upload(cachePath, audio, { contentType: "audio/mpeg", upsert: true });
        if (upErr) {
          console.error(`[voice] cache upload error=${upErr.message}`);
        }
        // também grava cópia identificável por jobId (auditoria)
        if (jobId) {
          const auditPath = `voice/${jobId}/${Date.now()}-${provider}-${emotion}.mp3`;
          await admin.storage
            .from("audio")
            .upload(auditPath, audio, { contentType: "audio/mpeg", upsert: true });
        }
        const { data: pub } = admin.storage.from("audio").getPublicUrl(cachePath);
        return new Response(
          JSON.stringify({
            ok: true,
            provider,
            emotion,
            audioUrl: pub.publicUrl,
            bytes: audio.byteLength,
            cached: false,
            duration_ms: Date.now() - start,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Voice-Cache": "miss" } },
        );
      } catch (e) {
        console.error(`[voice] persist error=${(e as Error).message}`);
      }
    }

    console.log(`[voice] OK provider=${provider} emotion=${emotion} bytes=${audio.byteLength} elapsed=${Date.now() - start}ms`);
    return new Response(audio, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-Voice-Provider": provider,
        "X-Voice-Bytes": String(audio.byteLength),
      },
    });
  } catch (e) {
    console.error(`[voice] FATAL ${(e as Error).message}`);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
