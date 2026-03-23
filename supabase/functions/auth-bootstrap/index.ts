import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MASTER_EMAIL = "ceo@seuvideopronto.com";
const MASTER_USERNAME = "CEO-Leandro";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const masterPassword =
      Deno.env.get("MASTER_ADMIN_PASSWORD") ||
      Deno.env.get("VITE_MASTER_ADMIN_PASSWORD") ||
      "CEO-Leandro@2026";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingAdmin } = await adminClient
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (existingAdmin?.id) {
      return new Response(JSON.stringify({ ok: true, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ error: "Falha ao criar admin master." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passwordHash = await hash(masterPassword);

    await adminClient
      .from("users")
      .upsert({
        id: userId,
        email: MASTER_EMAIL,
        password_hash: passwordHash,
        username: MASTER_USERNAME,
        role: "admin",
        is_active: true,
      });

    await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" });

    await adminClient
      .from("profiles")
      .update({ full_name: MASTER_USERNAME, email: MASTER_EMAIL, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return new Response(JSON.stringify({ ok: true, created: true, email: MASTER_EMAIL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
