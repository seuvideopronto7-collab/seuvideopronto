import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// 🔥 IMPORT DIRETO (SEM LAZY PARA NÃO MATAR A TELA)
import VideoGeneratorUI from "@/components/VideoGeneratorUI";
import Content30Days from "@/components/Content30Days";
import DarkFlowEngine from "@/components/DarkFlowEngine";
import SalesMachine from "@/components/SalesMachine";
import VideoWizard from "@/components/wizard/VideoWizard";

const Index = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showCalendar, setShowCalendar] = useState(false);
  const [showDarkFlow, setShowDarkFlow] = useState(false);
  const [showSalesMachine, setShowSalesMachine] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const initialProduto = (location.state as any)?.produto || null;
  const autoStart = Boolean((location.state as any)?.autoStart);

  // 🚀 AUTO START DO SISTEMA (TELA NUNCA MAIS MORTA)
  useEffect(() => {
    console.log("🔥 PDG FULL ATIVO");
    setShowGenerator(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      
      {/* HEADER */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">PDG Cinema</h1>
              <p className="text-xs text-muted-foreground">Sistema ativo 🔥</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">
              {profile?.full_name || "CEO-Leandro"}
            </span>

            {isAdmin && (
              <Button size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}

            <Button size="sm" onClick={() => navigate("/apis")}>
              APIs
            </Button>

            <Button size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>

        </div>
      </header>

      {/* MAIN */}
      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* HERO */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">
            🎬 Gerador Cinematográfico Ativo
          </h2>
          <p className="text-muted-foreground">
            Sistema rodando em tempo real
          </p>
        </div>

        {/* BOTÕES */}
        <div className="grid gap-4">

          <Button onClick={() => setShowGenerator(true)}>
            🎥 Gerador de Vídeo
          </Button>

          <Button onClick={() => setShowDarkFlow(true)}>
            🔥 Dark Flow
          </Button>

          <Button onClick={() => setShowSalesMachine(true)}>
            ⚡ Máquina de Vendas
          </Button>

          <Button onClick={() => setShowCalendar(true)}>
            📅 Conteúdo 30 Dias
          </Button>

          <Button onClick={() => setShowWizard(true)}>
            🧭 Video Wizard
          </Button>

        </div>

        {/* 🔥 MOTOR PRINCIPAL (SEMPRE ATIVO) */}
        {showGenerator && (
          <div className="bg-black p-6 rounded-xl border border-green-500">
            <h2 className="text-white text-xl font-bold mb-2">
              🎬 Sistema de Vídeo Ativo
            </h2>

            <VideoGeneratorUI />
          </div>
        )}

        {/* DARK FLOW */}
        {showDarkFlow && (
          <div className="p-4 border rounded-xl">
            <DarkFlowEngine />
          </div>
        )}

        {/* SALES */}
        {showSalesMachine && (
          <div className="p-4 border rounded-xl">
            <SalesMachine />
          </div>
        )}

        {/* CALENDÁRIO */}
        {showCalendar && (
          <div className="p-4 border rounded-xl">
            <Content30Days />
          </div>
        )}

        {/* WIZARD */}
        {showWizard && (
          <div className="p-4 border rounded-xl">
            <VideoWizard
              initialProduto={initialProduto}
              autoStart={autoStart}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default Index;
