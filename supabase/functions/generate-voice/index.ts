// Generate Voice — 3 camadas: ElevenLabs → OpenAI → erro estruturado
// Retorna áudio binário (audio/mpeg) com header X-Voice-Provider indicando fonte.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-voice-provider, x-voice-bytes",
};

const ELEVEN_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "EXAVITQu4vr4xnSDxMaL"; // Sarah (PT-friendly)
const TTS_TIMEOUT_MS = 20_000;

async function tryElevenLabs(text: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true },
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
    if (buf.byteLength < 800) {
      console.error(`[voice] eleven too small=${buf.byteLength}`);
      return null;
    }
    return buf;
  } catch (e) {
    clearTimeout(t);
    console.error(`[voice] eleven error=${(e as Error).message}`);
    return null;
  }
}

async function tryOpenAI(text: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
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
    // Auth (best-effort — protege uso indevido)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    if (!text || text.length < 2) {
      return new Response(JSON.stringify({ error: "text obrigatório (min 2 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) ElevenLabs
    let provider = "elevenlabs";
    let audio = await tryElevenLabs(text);

    // 2) OpenAI
    if (!audio) {
      provider = "openai";
      audio = await tryOpenAI(text);
    }

    if (!audio) {
      console.error(`[voice] FAIL_ALL elapsed=${Date.now() - start}ms`);
      return new Response(
        JSON.stringify({ error: "all_providers_failed", attempts: ["elevenlabs", "openai"] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persistência opcional no bucket "audio" para reuso
    if (persist) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        const path = `voice/${jobId ?? "anon"}/${Date.now()}-${provider}.mp3`;
        const { error: upErr } = await admin.storage
          .from("audio")
          .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
        if (!upErr) {
          const { data: pub } = admin.storage.from("audio").getPublicUrl(path);
          return new Response(
            JSON.stringify({
              ok: true,
              provider,
              audioUrl: pub.publicUrl,
              bytes: audio.byteLength,
              duration_ms: Date.now() - start,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.error(`[voice] upload error=${upErr.message}`);
      } catch (e) {
        console.error(`[voice] persist error=${(e as Error).message}`);
      }
    }

    // Default: stream binário
    console.log(`[voice] OK provider=${provider} bytes=${audio.byteLength} elapsed=${Date.now() - start}ms`);
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
