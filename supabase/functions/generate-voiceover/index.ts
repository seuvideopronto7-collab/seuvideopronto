import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const rateLimitMap = new Map<string, number[]>();
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) || []).filter((t) => now - t < 60_000);
  if (timestamps.length >= 5) return true;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return false;
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "onwK4e9ZLuTAKqWW03F9";
const TTS_TIMEOUT_MS = 15_000;

export async function generateVoiceover(text: string): Promise<Uint8Array> {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  const startMs = Date.now();
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;

  try {
    console.log(`[voiceover] START text_length=${text.length} voice=${ELEVENLABS_VOICE_ID}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - startMs;

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[voiceover] API_ERROR status=${res.status} elapsed=${elapsedMs}ms body=${errBody}`);
      throw new Error(`ElevenLabs TTS failed: ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const buffer = new Uint8Array(await res.arrayBuffer());
    console.log(`[voiceover] OK elapsed=${elapsedMs}ms bytes=${buffer.byteLength}`);

    if (buffer.byteLength < 500) {
      throw new Error(`Audio too small (${buffer.byteLength} bytes) — likely empty`);
    }

    return buffer;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      const elapsedMs = Date.now() - startMs;
      console.error(`[voiceover] TIMEOUT after ${elapsedMs}ms (limit=${TTS_TIMEOUT_MS}ms)`);
      throw new Error(`Narração cancelada: timeout de ${TTS_TIMEOUT_MS / 1000}s excedido`);
    }
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const requestStart = Date.now();

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    if (isRateLimited(user.id)) {
      return json({ error: "Rate limit excedido. Tente novamente em 1 minuto." }, 429);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const { text, jobId } = body as { text?: string; jobId?: string };
    if (!text || typeof text !== "string" || text.trim().length < 2) {
      return json({ error: "text requerido (min 2 caracteres)" }, 400);
    }

    // Generate voiceover with timeout protection
    const audioBuffer = await generateVoiceover(text.trim());

    // Persist to storage
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const storagePath = `voiceovers/${jobId || user.id}/${Date.now()}.mp3`;
    const { error: uploadErr } = await admin.storage
      .from("audio")
      .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

    let audioUrl: string | null = null;
    if (uploadErr) {
      console.error(`[voiceover] UPLOAD_ERROR path=${storagePath}`, uploadErr);
      // Still return binary audio as fallback
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    const { data: pubData } = admin.storage.from("audio").getPublicUrl(storagePath);
    audioUrl = pubData.publicUrl;

    // Link to job if provided
    if (jobId) {
      await admin
        .from("video_jobs")
        .update({ audio_url: audioUrl })
        .eq("id", jobId)
        .then(({ error }) => {
          if (error) console.error(`[voiceover] JOB_LINK_ERROR jobId=${jobId}`, error);
          else console.log(`[voiceover] linked to job ${jobId}`);
        });
    }

    const totalMs = Date.now() - requestStart;
    console.log(`[voiceover] DONE total=${totalMs}ms audioUrl=${audioUrl}`);

    return json({ audioUrl, duration_ms: totalMs, storagePath });
  } catch (e) {
    const totalMs = Date.now() - requestStart;
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error(`[voiceover] FAIL total=${totalMs}ms error=${message}`);
    return json({ error: message, duration_ms: totalMs }, 500);
  }
});
