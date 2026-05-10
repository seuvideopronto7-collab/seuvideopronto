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

/**
 * VIDEO AUTO-HEAL
 * 
 * Scans for jobs that are stuck/broken and attempts recovery:
 * 1. Jobs with status "completed"/"done" but no video_url → mark as error
 * 2. Jobs with status "fallback" → mark as error (no fake fallbacks)
 * 3. Jobs with external video_url (not in our storage) → re-download to storage
 * 4. Jobs stuck in processing for >10 min → mark as error for retry
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const healSecret = Deno.env.get("HEAL_JOB_SECRET") || "";

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Config missing" }, 500);

  // ─── AUTH: shared secret OR admin JWT ─────────────────────
  const providedSecret = req.headers.get("x-heal-secret") || "";
  let authorized = false;
  if (healSecret && providedSecret && providedSecret === healSecret) {
    authorized = true;
  } else if (anonKey) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const adminCheck = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        const { data: roleRow } = await adminCheck
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const healed: string[] = [];
  const errors: string[] = [];

  try {
    // ── 1. Fix "completed"/"done" jobs with no video_url ──
    const { data: noVideoJobs } = await admin
      .from("video_jobs")
      .select("id, status, video_url")
      .in("status", ["completed", "done"])
      .is("video_url", null)
      .limit(50);

    if (noVideoJobs?.length) {
      for (const job of noVideoJobs) {
        await admin.from("video_jobs").update({
          status: "error",
          error: "Auto-heal: job marcado como concluído sem arquivo MP4",
        }).eq("id", job.id);
        healed.push(`${job.id}: completed→error (no video_url)`);
      }
    }

    // ── 2. Convert fallback jobs to error ──
    const { data: fallbackJobs } = await admin
      .from("video_jobs")
      .select("id, video_url")
      .eq("status", "fallback")
      .limit(50);

    if (fallbackJobs?.length) {
      for (const job of fallbackJobs) {
        await admin.from("video_jobs").update({
          status: "error",
          video_url: null,
          error: "Auto-heal: fallback removido — aguardando reprocessamento",
        }).eq("id", job.id);
        healed.push(`${job.id}: fallback→error`);
      }
    }

    // ── 3. Persist external video URLs to our storage ──
    const { data: externalJobs } = await admin
      .from("video_jobs")
      .select("id, video_url")
      .eq("status", "completed")
      .not("video_url", "is", null)
      .limit(50);

    if (externalJobs?.length) {
      for (const job of externalJobs) {
        const url = job.video_url as string;
        // Skip if already in our storage
        if (url.includes("supabase.co/storage/") || url.includes("/videos/generated/")) continue;
        // Skip CDN assets (they're demos, not real)
        if (url.startsWith("/") || url.includes("/__l5e/")) {
          await admin.from("video_jobs").update({
            status: "error",
            video_url: null,
            error: "Auto-heal: vídeo demo removido — aguardando reprocessamento",
          }).eq("id", job.id);
          healed.push(`${job.id}: demo-asset→error`);
          continue;
        }
        // External URL (e.g. Shotstack, Runway) → download and persist
        try {
          const res = await fetch(url);
          if (!res.ok) {
            errors.push(`${job.id}: fetch failed ${res.status}`);
            continue;
          }
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength < 1000) {
            errors.push(`${job.id}: file too small ${buffer.byteLength}`);
            continue;
          }
          const storagePath = `generated/${job.id}.mp4`;
          const { error: uploadErr } = await admin.storage
            .from("videos")
            .upload(storagePath, buffer, { contentType: "video/mp4", upsert: true });
          if (uploadErr) {
            errors.push(`${job.id}: upload error ${uploadErr.message}`);
            continue;
          }
          const { data: urlData } = admin.storage.from("videos").getPublicUrl(storagePath);
          await admin.from("video_jobs").update({
            video_url: urlData.publicUrl,
          }).eq("id", job.id);
          healed.push(`${job.id}: persisted to storage`);
        } catch (e) {
          errors.push(`${job.id}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }
    }

    // ── 4. Timeout stuck jobs (>10 min in processing states) ──
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckJobs } = await admin
      .from("video_jobs")
      .select("id, status")
      .in("status", ["started", "processing", "generating_script", "generating_voice", "generating_video", "generating_images", "generating_audio", "rendering"])
      .lt("updated_at", tenMinAgo)
      .limit(50);

    if (stuckJobs?.length) {
      for (const job of stuckJobs) {
        await admin.from("video_jobs").update({
          status: "error",
          progress: 100,
          error: `Auto-heal: job travado em "${job.status}" por mais de 10 minutos`,
        }).eq("id", job.id);
        healed.push(`${job.id}: stuck(${job.status})→error`);
      }
    }

    console.log(`[video-heal] ✅ healed=${healed.length} errors=${errors.length}`);
    return json({ healed, errors, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("[video-heal] fatal error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
