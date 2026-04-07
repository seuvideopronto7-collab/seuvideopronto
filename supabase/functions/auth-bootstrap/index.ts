import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const masterPassword = Deno.env.get("MASTER_ADMIN_PASSWORD");

    // If master password is not configured, skip bootstrap silently — this is not an error
    if (!supabaseUrl || !supabaseServiceKey || !masterPassword) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if admin already exists in user_roles
    const { data: existingAdmin } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (existingAdmin?.user_id) {
      return new Response(JSON.stringify({ ok: true, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MASTER_EMAIL = "ceo@seuvideopronto.com";
    const MASTER_USERNAME = "CEO-Leandro";

    // Create or find auth user
    let userId: string | null = null;
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: masterPassword,
      email_confirm: true,
      user_metadata: { full_name: MASTER_USERNAME },
    });

    if (createError && createError.message?.toLowerCase().includes("already registered")) {
      const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === MASTER_EMAIL);
      userId = existing?.id || null;
    } else if (createdUser?.user?.id) {
      userId = createdUser.user.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "could_not_resolve_user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" });

    await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        full_name: MASTER_USERNAME,
        email: MASTER_EMAIL,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

    return new Response(JSON.stringify({ ok: true, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Never return 500 — bootstrap is best-effort
    console.error("auth-bootstrap error:", (error as Error).message);
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
