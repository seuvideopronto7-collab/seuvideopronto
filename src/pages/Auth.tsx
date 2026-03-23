import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    username: "",
    identifier: "",
    password: "",
  });

  const update = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleLogin = async () => {
    setLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: form.identifier, password: form.password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.user?.email) {
      setLoading(false);
      toast.error(payload?.error || "Falha ao autenticar.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: payload.user.email,
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      localStorage.setItem(
        "svpa.session",
        JSON.stringify({ user_id: payload.user.id, role: payload.user.role, token: payload.token }),
      );
      toast.success("Login realizado!");
      navigate("/");
    }
  };

  const handleSignup = async () => {
    if (!form.fullName || !form.whatsapp || !form.email || !form.username || !form.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, whatsapp: form.whatsapp },
        emailRedirectTo: window.location.origin,
      },
    });
    if (!error && data?.user?.id) {
      const { error: syncError } = await supabase.functions.invoke("auth-sync-user", {
        body: {
          userId: data.user.id,
          email: form.email,
          username: form.username,
          password: form.password,
        },
      });
      if (syncError) {
        toast.error(syncError.message);
      }
    }
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // Update profile with whatsapp after signup
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isLogin ? handleLogin() : handleSignup();
  };

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold mx-auto">
            F
          </div>
          <h1 className="text-2xl font-bold gradient-text">Seu Vídeo Pronto</h1>
          <p className="text-sm text-muted-foreground">Vídeo Viral Profissional</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-center">
            {isLogin ? "Entrar" : "Criar Conta"}
          </h2>

          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Nome Completo</label>
                <Input
                  placeholder="Seu nome completo"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="bg-muted/50 border-border/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Usuário</label>
                <Input
                  placeholder="Seu usuário"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  className="bg-muted/50 border-border/50"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">WhatsApp</label>
                <Input
                  placeholder="(99) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value)}
                  className="bg-muted/50 border-border/50"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              {isLogin ? "Email ou usuário" : "E-mail"}
            </label>
            <Input
              type={isLogin ? "text" : "email"}
              placeholder={isLogin ? "Email ou usuário" : "seu@email.com"}
              value={isLogin ? form.identifier : form.email}
              onChange={(e) => update(isLogin ? "identifier" : "email", e.target.value)}
              className="bg-muted/50 border-border/50"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="bg-muted/50 border-border/50 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="neon"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Entrar
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Criar Conta
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
