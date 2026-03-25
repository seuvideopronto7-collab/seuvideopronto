import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SafeRender from "@/components/SafeRender";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 🔥 IMPORT DIRETO (SEM LAZY PARA NÃO MATAR A TELA)
import VideoGeneratorUI from "@/components/VideoGeneratorUI";
import Content30Days from "@/components/Content30Days";
import DarkFlowEngine from "@/components/DarkFlowEngine";
import SalesMachine from "@/components/SalesMachine";
import VideoWizard from "@/components/wizard/VideoWizard";

const Index = () => {
  const auth = useAuth();
  if (!auth) {
    return <div className="min-h-screen bg-background p-6">Carregando autenticação...</div>;
  }
  if (auth.loading) {
    return <div className="min-h-screen bg-background p-6">Carregando autenticação...</div>;
  }
  const { signOut, isAdmin, profile, user } = auth;
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<
    "generator" | "darkflow" | "sales" | "calendar" | "wizard"
  >("generator");
  const [testLoading, setTestLoading] = useState(false);

  const initialProduto = (location.state as any)?.produto || null;
  const autoStart = Boolean((location.state as any)?.autoStart);

  const criarVideoTeste = async () => {
    try {
      setTestLoading(true);
      toast.info("Criando job de vídeo teste...");

      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
          estilo: "cinematografico",
          movimento: "zoom cinematografico",
          duracao: 5,
          conteudoRelacionado: true,
          prompt: "Produto premium em destaque com iluminação cinematográfica",
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.warning(`Fallback ativo: ${data.error}`);
      } else if (data?.videoUrl) {
        toast.success("Vídeo gerado com sucesso!");
        console.log("Video URL:", data.videoUrl);
      } else {
        toast.info("Job criado. Aguardando processamento...");
      }
    } catch (err: any) {
      console.error("Erro ao gerar vídeo teste:", err);
      toast.error("Erro ao gerar vídeo teste. Sistema protegido pelo Safe Mode.");
    } finally {
      setTestLoading(false);
    }
  };

  // 🚀 AUTO START DO SISTEMA (TELA NUNCA MAIS MORTA)
  useEffect(() => {
    console.log("ACTIVE TAB:", activeTab);
  }, [activeTab]);

  if (!activeTab) {
    return <div className="min-h-screen bg-background p-6">⚠️ Sistema não carregado</div>;
  }

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

          <Button onClick={() => setActiveTab("generator")}>
            🎥 Gerador de Vídeo
          </Button>

          <Button onClick={() => setActiveTab("darkflow")}>
            🔥 Dark Flow
          </Button>

          <Button onClick={() => setActiveTab("sales")}>
            ⚡ Máquina de Vendas
          </Button>

          <Button onClick={() => setActiveTab("calendar")}>
            📅 Conteúdo 30 Dias
          </Button>

          <Button onClick={() => setActiveTab("wizard")}>
            🧭 Video Wizard
          </Button>

          <Button
            onClick={criarVideoTeste}
            disabled={testLoading}
            variant="outline"
            className="border-primary text-primary"
          >
            {testLoading ? "⏳ Gerando..." : "🚀 Gerar Vídeo Teste"}
          </Button>

        </div>

        {/* 🔥 MOTOR PRINCIPAL (SEMPRE ATIVO) */}
        {activeTab === "generator" && (
          <SafeRender label="PDG Safe Mode">
            {VideoGeneratorUI ? (
              <div className="bg-black p-6 rounded-xl border border-green-500">
                <h2 className="text-white text-xl font-bold mb-2">
                  🎬 Sistema de Vídeo Ativo
                </h2>
                <VideoGeneratorUI />
              </div>
            ) : (
              <div className="p-6">Carregando...</div>
            )}
          </SafeRender>
        )}

        {/* DARK FLOW */}
        {activeTab === "darkflow" && (
          <SafeRender label="PDG Safe Mode">
            <div className="p-4 border rounded-xl">
              <DarkFlowEngine />
            </div>
          </SafeRender>
        )}

        {/* SALES */}
        {activeTab === "sales" && (
          <SafeRender label="PDG Safe Mode">
            <div className="p-4 border rounded-xl">
              <SalesMachine />
            </div>
          </SafeRender>
        )}

        {/* CALENDÁRIO */}
        {activeTab === "calendar" && (
          <SafeRender label="PDG Safe Mode">
            <div className="p-4 border rounded-xl">
              <Content30Days />
            </div>
          </SafeRender>
        )}

        {/* WIZARD */}
        {activeTab === "wizard" && (
          <SafeRender label="PDG Safe Mode">
            <div className="p-4 border rounded-xl">
              <VideoWizard
                initialProduto={initialProduto}
                autoStart={autoStart}
              />
            </div>
          </SafeRender>
        )}

      </main>
    </div>
  );
};

export default Index;
