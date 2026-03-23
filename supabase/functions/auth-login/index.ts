import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LoginPayload = {
  identifier?: string;
  password?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Supabase env not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { identifier, password } = (await req.json().catch(() => ({}))) as LoginPayload;
    const normalizedIdentifier = (identifier || "").trim();
    const normalizedPassword = (password || "").trim();

    if (!normalizedIdentifier || !normalizedPassword) {
      return new Response(JSON.stringify({ error: "Informe usuário/email e senha." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const isEmail = normalizedIdentifier.includes("@");
    const { data: user, error: userError } = await adminClient
      .from("users")
      .select("id, email, username, role, password_hash, is_active")
      .eq(isEmail ? "email" : "username", normalizedIdentifier)
      .maybeSingle();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await compare(normalizedPassword, user.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = crypto.randomUUID();
    await adminClient
      .from("user_sessions")
      .insert({ user_id: user.id, role: user.role, token });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          is_active: user.is_active,
        },
        token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
