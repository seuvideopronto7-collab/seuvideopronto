// Voice Engine V2 — fallback em 3 camadas: ElevenLabs → OpenAI TTS → marcador browser-tts
// Garante que NUNCA volte sem áudio (ou retorna marker para o browser sintetizar localmente).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const ELEVEN_VOICE = Deno.env.get("ELEVENLABS_VOICE_ID") || "onwK4e9ZLuTAKqWW03F9";
const TIMEOUT_MS = 15_000;

async function tryElevenLabs(text: string): Promise<Uint8Array> {
  if (!ELEVEN_KEY) throw new Error("ELEVEN_NO_KEY");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true },
        }),
        signal: ctrl.signal,
      }
    );
    if (!res.ok) throw new Error(`ELEVEN_HTTP_${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 5000) throw new Error("ELEVEN_TOO_SMALL");
    return buf;
  } finally {
    clearTimeout(t);
  }
}

async function tryOpenAI(text: string): Promise<Uint8Array> {
  if (!OPENAI_KEY) throw new Error("OPENAI_NO_KEY");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        voice: "onyx",
        input: text,
        response_format: "mp3",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[voice-v2] openai err", res.status, body.slice(0, 200));
      throw new Error(`OPENAI_HTTP_${res.status}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1000) throw new Error("OPENAI_TOO_SMALL");
    return buf;
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const jobId = body?.jobId ? String(body.jobId) : null;
    if (text.length < 2) return json({ error: "text requerido" }, 400);

    let audio: Uint8Array | null = null;
    let provider = "none";
    let fallback_used = false;
    const tried: string[] = [];

    // 1) ElevenLabs
    try {
      audio = await tryElevenLabs(text);
      provider = "elevenlabs";
      tried.push("elevenlabs:ok");
    } catch (e) {
      tried.push(`elevenlabs:${e instanceof Error ? e.message : "fail"}`);
    }

    // 2) OpenAI TTS
    if (!audio) {
      try {
        audio = await tryOpenAI(text);
        provider = "openai";
        fallback_used = true;
        tried.push("openai:ok");
      } catch (e) {
        tried.push(`openai:${e instanceof Error ? e.message : "fail"}`);
      }
    }

    // 3) Browser fallback (marker)
    if (!audio) {
      console.warn("[voice-v2] all providers failed, returning browser marker", tried);
      return json({
        ok: true,
        provider: "browser",
        audioUrl: "__browser_tts__",
        fallback_used: true,
        attempts: tried,
        text,
      });
    }

    // Persist to user-scoped path
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const path = `${user.id}/voiceovers/${jobId || crypto.randomUUID()}-${Date.now()}.mp3`;
    const { error: upErr } = await admin.storage
      .from("audio")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (upErr) {
      console.error("[voice-v2] upload error", upErr);
      return json({ error: "STORAGE_FAIL", detail: upErr.message }, 500);
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("audio")
      .createSignedUrl(path, 60 * 60 * 24);
    if (signErr || !signed?.signedUrl) {
      return json({ error: "SIGN_FAIL", detail: signErr?.message }, 500);
    }

    return json({
      ok: true,
      provider,
      fallback_used,
      attempts: tried,
      audioUrl: signed.signedUrl,
      storagePath: path,
      bytes: audio.byteLength,
    });
  } catch (e) {
    console.error("[voice-v2] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
