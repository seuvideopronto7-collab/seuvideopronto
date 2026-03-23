import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compare, hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

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
    const lookupValue = isEmail ? normalizedIdentifier.toLowerCase() : normalizedIdentifier;
    let userQuery = adminClient
      .from("users")
      .select("id, email, username, role, password_hash, is_active");
    userQuery = isEmail ? userQuery.eq("email", lookupValue) : userQuery.ilike("username", lookupValue);
    const { data: user, error: userError } = await userQuery.maybeSingle();

    let resolvedUser = user || null;

    if (userError || !resolvedUser) {
      if (isEmail && supabaseAnonKey) {
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
          email: lookupValue,
          password: normalizedPassword,
        });

        if (authError || !authData?.user?.id) {
          return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const baseUsername = lookupValue.split("@")[0];
        const { data: usernameConflict } = await adminClient
          .from("users")
          .select("id")
          .eq("username", baseUsername)
          .limit(1)
          .maybeSingle();

        const resolvedUsername = usernameConflict?.id
          ? `${baseUsername}-${authData.user.id.slice(0, 6)}`
          : baseUsername;

        const passwordHash = await hash(normalizedPassword);
        const { data: inserted } = await adminClient
          .from("users")
          .insert({
            id: authData.user.id,
            email: lookupValue,
            password_hash: passwordHash,
            username: resolvedUsername,
            role: "user",
            is_active: true,
          })
          .select("id, email, username, role, password_hash, is_active")
          .maybeSingle();

        resolvedUser = inserted || null;
      }
    }

    if (!resolvedUser) {
      return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      // already validated via Supabase auth above
    } else {
      const valid = await compare(normalizedPassword, resolvedUser.password_hash);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Usuário ou senha inválidos." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const token = crypto.randomUUID();
    await adminClient
      .from("user_sessions")
      .insert({ user_id: resolvedUser.id, role: resolvedUser.role, token });

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: resolvedUser.id,
          email: resolvedUser.email,
          username: resolvedUser.username,
          role: resolvedUser.role,
          is_active: resolvedUser.is_active,
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
