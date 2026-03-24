import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VideoWizard from "@/components/wizard/VideoWizard";
import Content30Days from "@/components/Content30Days";
import DarkFlowEngine from "@/components/DarkFlowEngine";

const Index = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDarkFlow, setShowDarkFlow] = useState(false);
  const initialProduto = (location.state as any)?.produto || null;
  const autoStart = Boolean((location.state as any)?.autoStart);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Fature</h1>
              <p className="text-xs text-muted-foreground">Engine de Vídeos Virais</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mr-2">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-neon" />
              {profile?.full_name || "Usuário"}
            </span>
            {isAdmin && (
              <span className="text-xs font-mono flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-accent">
                🟢 Admin ativo · {profile?.full_name || "CEO-Leandro"}
              </span>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/apis")}>
              APIs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/planos")}>
              Planos
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/produtos-prontos")}>
              Produtos Prontos
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2 pb-2">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">
            Seu Vídeo Pronto
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Siga o passo a passo e crie seu vídeo viral em minutos
          </p>
        </div>

        {/* CTA Infoproduto */}
        <button
          onClick={() => navigate("/infoproduto")}
          className="w-full group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-purple-500/10 to-accent/10 p-6 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_40px_-8px_hsl(var(--neon-pink)/0.4)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl shrink-0">
              🚀
            </div>
            <div>
              <h3 className="text-lg font-bold">PUBLICAR MEU INFOPRODUTO</h3>
              <p className="text-sm text-muted-foreground">
                Curso + Ebook + VSL + Kit de Vendas com IA em minutos
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* CTA Conteúdo 30 Dias */}
        <button
          onClick={() => setShowCalendar((prev) => !prev)}
          className="w-full group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/10 via-cyan-500/10 to-primary/10 p-6 text-left transition-all hover:border-accent/60 hover:shadow-[0_0_40px_-8px_hsl(var(--neon-cyan)/0.4)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-2xl shrink-0">
              📅
            </div>
            <div>
              <h3 className="text-lg font-bold">CONTEÚDO PARA 30 DIAS</h3>
              <p className="text-sm text-muted-foreground">
                Calendário automático + autopost integrado
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {showCalendar && <Content30Days />}

        {/* CTA Dark Flow */}
        <button
          onClick={() => setShowDarkFlow((prev) => !prev)}
          className="w-full group relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/15 via-black/40 to-red-500/10 p-6 text-left transition-all hover:border-red-500/70 hover:shadow-[0_0_40px_-8px_rgba(255,0,0,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-black/80 border border-red-500/40 flex items-center justify-center text-2xl shrink-0">
              🔥
            </div>
            <div>
              <h3 className="text-lg font-bold">GERAR CONTEUDO DARK</h3>
              <p className="text-sm text-muted-foreground">
                Hook agressivo + design dark + video + voz
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {showDarkFlow && <DarkFlowEngine />}

        {/* Wizard */}
        <VideoWizard initialProduto={initialProduto} autoStart={autoStart} />
      </main>
    </div>
  );
};

export default Index;
