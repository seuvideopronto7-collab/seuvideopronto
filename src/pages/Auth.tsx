import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn, UserPlus, Zap, Shield, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";
import { getStoredUTM, clearUTM } from "@/lib/utm";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    password: "",
  });

  const update = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleLogin = async () => {
    const email = form.email.trim();
    const password = form.password.trim();
    if (!email || !password) {
      toast.error("Preencha email e senha.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        track("error_shown", { step: "login", message: error.message });
        toast.error(error.message === "Invalid login credentials"
          ? "Email ou senha inválidos."
          : error.message);
      } else {
        track("login_completed", { method: "email" });
      }
      // Navigation handled by useEffect watching user state
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Falha ao autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres.");
      return;
    }

    track("signup_started", { method: "email" });
    setLoading(true);
    try {
      const utm = getStoredUTM();
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName, whatsapp: form.whatsapp, ...utm },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        track("error_shown", { step: "signup", message: error.message });
        toast.error(error.message);
      } else {
        track("signup_completed", { method: "email", ...utm });
        clearUTM();
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    isLogin ? handleLogin() : handleSignup();
  };

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        toast.success("Acesso admin liberado. Controle total ativado.", { icon: "🔥" });
        navigate("/admin/dashboard");
      } else {
        toast.success("Login realizado!");
        navigate("/dashboard");
      }
    }
  }, [authLoading, user, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Seu Vídeo Pronto
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Gere vídeos cinematográficos profissionais com IA em minutos. Upload → Roteiro → Voz → Vídeo.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, label: "IA gera roteiro e voz automaticamente" },
              { icon: Video, label: "Vídeos cinematográficos em HD" },
              { icon: Shield, label: "Pipeline 100% seguro e profissional" },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
              <Video className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Seu Vídeo Pronto</h1>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 space-y-6 shadow-2xl shadow-primary/5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                {isLogin ? "Bem-vindo de volta" : "Criar sua conta"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Entre para acessar o painel" : "Comece a gerar vídeos agora"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nome Completo
                    </label>
                    <Input
                      placeholder="Seu nome completo"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      WhatsApp
                    </label>
                    <Input
                      placeholder="(99) 99999-9999"
                      value={form.whatsapp}
                      onChange={(e) => update("whatsapp", e.target.value)}
                      className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="h-11 bg-secondary/50 border-border/30 focus:border-primary/50 transition-colors pr-10"
                    required
                    minLength={6}
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
                className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Entrar
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Criar Conta
                  </span>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card/50 px-3 text-muted-foreground">ou</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isLogin ? "Criar conta grátis" : "Fazer login"}
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground/50">
            Ao continuar, você concorda com nossos termos de uso.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
