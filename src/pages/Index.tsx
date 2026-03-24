import { Suspense, lazy, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const VideoWizard = lazy(() => import("@/components/wizard/VideoWizard"));
const Content30Days = lazy(() => import("@/components/Content30Days"));
const DarkFlowEngine = lazy(() => import("@/components/DarkFlowEngine"));
const SalesMachine = lazy(() => import("@/components/SalesMachine"));
const SystemBootFallback = ({ label }: { label?: string }) => (
  <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-[0_0_30px_-18px_rgba(59,130,246,0.45)]">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <div>
        <p className="text-sm font-semibold">Sistema iniciando...</p>
        <p className="text-xs text-muted-foreground">{label || "Preparando módulos essenciais"}</p>
      </div>
    </div>
  </div>
);

const Index = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDarkFlow, setShowDarkFlow] = useState(false);
  const [showSalesMachine, setShowSalesMachine] = useState(false);
  const [showGenerator, setShowGenerator] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const initialProduto = (location.state as any)?.produto || null;
  const autoStart = Boolean((location.state as any)?.autoStart);
  const hasAnyActive = showCalendar || showDarkFlow || showSalesMachine || showGenerator || showWizard;

  useEffect(() => {
    setShowGenerator(true);
  }, []);

  useEffect(() => {
    if (!hasAnyActive) {
      setShowGenerator(true);
    }
  }, [hasAnyActive]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log("Estados de modulos", {
      showCalendar,
      showDarkFlow,
      showSalesMachine,
      showGenerator,
      showWizard,
    });
  }, [showCalendar, showDarkFlow, showSalesMachine, showGenerator, showWizard]);

  const handleShowCalendar = () => {
    console.log("Conteudo 30 dias ativado");
    try {
      setShowCalendar(true);
    } catch (e) {
      console.error("Erro Conteudo 30 dias:", e);
    }
  };

  const handleShowSalesMachine = () => {
    console.log("Sales Machine ativada");
    try {
      setShowSalesMachine(true);
    } catch (e) {
      console.error("Erro Sales Machine:", e);
    }
  };

  const handleShowDarkFlow = () => {
    console.log("DarkFlow ativado");
    try {
      setShowDarkFlow(true);
    } catch (e) {
      console.error("Erro DarkFlow:", e);
    }
  };

  const handleShowGenerator = () => {
    console.log("Gerador Cinematografico ativado");
    setShowGenerator(true);
  };

  const handleShowWizard = () => {
    console.log("Video Wizard ativado");
    setShowWizard(true);
  };

  const handleNavigate = (label: string, path: string) => {
    console.log(`Navegacao: ${label}`);
    navigate(path);
  };

  const handleSignOut = () => {
    console.log("Sair acionado");
    signOut();
  };

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
              <h1 className="text-lg font-bold gradient-text">PDG Cinema</h1>
              <p className="text-xs text-muted-foreground">Plataforma cinematografica premium</p>
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
              <Button variant="ghost" size="sm" onClick={() => handleNavigate("Admin", "/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("Editor Pro Real", "/editor-pro-real")}>
              Editor Pro Real
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("APIs", "/apis")}>
              APIs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("Planos", "/planos")}>
              Planos
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("Perfil", "/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("Produtos Prontos", "/produtos-prontos")}>
              Produtos Prontos
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6 overflow-x-hidden">
        {isBooting && <SystemBootFallback />}
        {/* Hero */}
        <div className="text-center space-y-3 pb-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Modo cinema automatico</p>
          <h2 className="text-3xl md:text-4xl font-semibold">
            Transforme uma simples imagem de produto em um video cinematografico altamente comercial.
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Upload, roteiro, voz, trilha e renderizacao automatica em um unico fluxo.
          </p>
        </div>

        {/* CTA Infoproduto */}
        <button
          onClick={() => handleNavigate("Infoproduto", "/infoproduto")}
          className="w-full group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-[#f5c451]/10 via-[#e53935]/10 to-[#3b82f6]/10 p-6 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_40px_-8px_rgba(245,196,81,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#f5c451] to-[#3b82f6] flex items-center justify-center text-2xl shrink-0">
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

        {/* CTA Editor Pro Real */}
        <button
          onClick={() => handleNavigate("Editor Pro Real", "/editor-pro-real")}
          className="w-full group relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-black via-red-500/10 to-black p-6 text-left transition-all hover:border-red-500/70 hover:shadow-[0_0_40px_-8px_rgba(255,0,0,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-black/80 border border-red-500/40 flex items-center justify-center text-2xl shrink-0">
              🎬
            </div>
            <div>
              <h3 className="text-lg font-bold">EDITOR PRO REAL</h3>
              <p className="text-sm text-muted-foreground">
                Renderizacao MP4 real com Dark Flow, voz e trilha
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* CTA Gerador de Video Premium */}
        <button
          onClick={() => handleNavigate("Gerador de Video Premium", "/svp-gerador-video-premium")}
          className="w-full group relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#0ea5e9]/10 via-[#7c3aed]/10 to-[#22d3ee]/10 p-6 text-left transition-all hover:border-cyan-300/60 hover:shadow-[0_0_40px_-8px_rgba(34,211,238,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#22d3ee] to-[#7c3aed] flex items-center justify-center text-2xl shrink-0">
              ✨
            </div>
            <div>
              <h3 className="text-lg font-bold">GERADOR DE VÍDEO PREMIUM</h3>
              <p className="text-sm text-muted-foreground">
                Do briefing ao Reels pronto com visual cinematográfico
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* CTA Conteúdo 30 Dias */}
        <button
          onClick={handleShowCalendar}
          className="w-full group relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-[#3b82f6]/10 via-[#06b6d4]/10 to-[#f5c451]/10 p-6 text-left transition-all hover:border-accent/60 hover:shadow-[0_0_40px_-8px_rgba(59,130,246,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#f5c451] flex items-center justify-center text-2xl shrink-0">
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

        {showCalendar && (
          <Suspense fallback={<SystemBootFallback label="Carregando calendario" />}>
            {Content30Days ? <Content30Days /> : <div>Erro ao carregar módulo</div>}
          </Suspense>
        )}

        {/* CTA Máquina de Vendas */}
        <button
          onClick={handleShowSalesMachine}
          className="w-full group relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-r from-[#f5c451]/15 via-amber-500/10 to-[#3b82f6]/10 p-6 text-left transition-all hover:border-primary/70 hover:shadow-[0_0_40px_-8px_rgba(245,196,81,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#f5c451] to-[#f59e0b] flex items-center justify-center text-2xl shrink-0">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold">ATIVAR MÁQUINA</h3>
              <p className="text-sm text-muted-foreground">
                Gerador → Conteúdo → Funil → Venda → Afiliado → Escala
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {showSalesMachine && (
          <Suspense fallback={<SystemBootFallback label="Carregando maquina de vendas" />}>
            {SalesMachine ? <SalesMachine /> : <div>Erro ao carregar módulo</div>}
          </Suspense>
        )}

        {/* CTA Dark Flow */}
        <button
          onClick={handleShowDarkFlow}
          className="w-full group relative overflow-hidden rounded-2xl border border-[#7c3aed]/40 bg-gradient-to-r from-[#7c3aed]/15 via-black/40 to-[#7c3aed]/10 p-6 text-left transition-all hover:border-[#7c3aed]/70 hover:shadow-[0_0_40px_-8px_rgba(124,58,237,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-black/80 border border-[#7c3aed]/40 flex items-center justify-center text-2xl shrink-0">
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

        {showDarkFlow && (
          <Suspense fallback={<SystemBootFallback label="Carregando motor IA" />}>
            {DarkFlowEngine ? <DarkFlowEngine /> : <div>Erro ao carregar módulo</div>}
          </Suspense>
        )}

        {/* CTA Gerador Cinematografico */}
        <button
          onClick={handleShowGenerator}
          className="w-full group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-[#10b981]/10 via-[#0ea5e9]/10 to-[#3b82f6]/10 p-6 text-left transition-all hover:border-emerald-500/60 hover:shadow-[0_0_40px_-8px_rgba(16,185,129,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#10b981] to-[#0ea5e9] flex items-center justify-center text-2xl shrink-0">
              🎥
            </div>
            <div>
              <h3 className="text-lg font-bold">GERADOR CINEMATOGRÁFICO</h3>
              <p className="text-sm text-muted-foreground">
                Ative o pipeline real de geração com proteção ativa
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {showGenerator && (
          <>
            {isBooting && <SystemBootFallback label="Carregando gerador" />}
            <div className="bg-[#12121A] p-6 rounded-xl border border-[#2A2A3A]">
              <h2 className="text-white text-xl font-bold">🎬 Gerador de Vídeo Cinematográfico</h2>
              <p className="text-gray-400">Sistema carregado com proteção ativa</p>
            </div>
            <VideoGeneratorUI />
          </>
        )}

        {/* CTA Video Wizard */}
        <button
          onClick={handleShowWizard}
          className="w-full group relative overflow-hidden rounded-2xl border border-[#f97316]/40 bg-gradient-to-r from-[#f97316]/10 via-[#f5c451]/10 to-[#3b82f6]/10 p-6 text-left transition-all hover:border-[#f97316]/70 hover:shadow-[0_0_40px_-8px_rgba(249,115,22,0.35)]"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f5c451] flex items-center justify-center text-2xl shrink-0">
              🧭
            </div>
            <div>
              <h3 className="text-lg font-bold">VIDEO WIZARD</h3>
              <p className="text-sm text-muted-foreground">
                Fluxo guiado com etapas inteligentes e fallback
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {showWizard && (
          <Suspense fallback={<SystemBootFallback label="Carregando wizard" />}>
            {VideoWizard ? (
              <VideoWizard initialProduto={initialProduto} autoStart={autoStart} />
            ) : (
              <div>Erro ao carregar módulo</div>
            )}
          </Suspense>
        )}
      </main>
    </div>
  );
};

export default Index;
