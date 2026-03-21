import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import ProductForm from "@/components/ProductForm";
import RoteiroDisplay from "@/components/RoteiroDisplay";
import YouTubeDashboard from "@/components/YouTubeDashboard";
import TikTokDashboard from "@/components/TikTokDashboard";
import VariacoesDisplay from "@/components/VariacoesDisplay";
import ImportContent from "@/components/ImportContent";
import AnalysisResult from "@/components/AnalysisResult";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState("");
  const [roteiroData, setRoteiroData] = useState<any>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [variacoesData, setVariacoesData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  // Keep form state at parent level so ImportContent can access it
  const [formData, setFormData] = useState({
    produto: "", nicho: "", publico: "", dor: "", beneficio: "", link: "",
  });

  const handleGenerate = async (form: any, tipo: string) => {
    setIsLoading(true);
    setLoadingType(tipo);
    setFormData(form);

    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: { ...form, tipo },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (tipo === "roteiro") {
        setRoteiroData(data);
        toast.success("Roteiro viral gerado! 🎬");
      } else if (tipo === "seo") {
        setSeoData(data);
        toast.success("SEO gerado! 🔥");
      } else if (tipo === "variacoes") {
        setVariacoesData(data);
        toast.success("10 variações geradas! ⚡");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar conteúdo");
    } finally {
      setIsLoading(false);
      setLoadingType("");
    }
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
              <h1 className="text-lg font-bold gradient-text">Fature</h1>
              <p className="text-xs text-muted-foreground">Engine de Vídeos Virais</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-neon" />
              {profile?.full_name || "Usuário"}
            </span>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2 pb-4">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">
            Máquina de Vídeos Virais
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            VÍDEO → POST → VIRALIZA → MONETIZA → VENDE → APRENDE → ESCALA
          </p>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="glass-card p-8 flex flex-col items-center gap-3 animate-slide-up">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {loadingType === "roteiro" && "Gerando roteiro viral com IA..."}
              {loadingType === "seo" && "Otimizando SEO global..."}
              {loadingType === "variacoes" && "Criando 10 variações..."}
            </p>
          </div>
        )}

        {/* Input */}
        <ProductForm onGenerate={handleGenerate} isLoading={isLoading} />

        {/* Import Content Module */}
        <ImportContent
          produto={formData.produto}
          nicho={formData.nicho}
          publico={formData.publico}
          dor={formData.dor}
          beneficio={formData.beneficio}
          link={formData.link}
          onResult={setAnalysisData}
          isLoading={importLoading}
          setIsLoading={setImportLoading}
        />

        {/* Analysis Results */}
        {analysisData && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold gradient-text">Resultado da Análise</h3>
            <AnalysisResult data={analysisData} />
            {/* Also populate SEO from analysis */}
            {analysisData.seo && !seoData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <YouTubeDashboard data={analysisData.seo} />
                <TikTokDashboard data={analysisData.seo} roteiro={analysisData.novo_roteiro} />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <RoteiroDisplay data={roteiroData} />
            <VariacoesDisplay data={variacoesData} />
          </div>
          <div className="space-y-6">
            <YouTubeDashboard data={seoData} />
            <TikTokDashboard data={seoData} roteiro={roteiroData?.roteiro} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
