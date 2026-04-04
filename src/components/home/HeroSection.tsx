import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeroSectionProps {
  onOpenGenerator: () => void;
}

const HeroSection = ({ onOpenGenerator }: HeroSectionProps) => {
  const [loading, setLoading] = useState(false);

  const handleQuickGenerate = async () => {
    try {
      setLoading(true);
      toast.info("🎬 Iniciando pipeline cinematográfico...");

      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          prompt: "Produto premium com iluminação cinematográfica, câmera lenta, fundo escuro elegante, estilo Apple Ads",
          voice: true,
          music: true,
        },
      });

      if (error) throw error;

      if (data?.video_url) {
        toast.success("🎬 Vídeo gerado com sucesso!");
      } else if (data?.jobId) {
        toast.success("Pipeline iniciado! Acompanhe o progresso abaixo.");
        onOpenGenerator();
      } else {
        toast.info("Job criado. Aguardando processamento...");
        onOpenGenerator();
      }
    } catch (err: any) {
      console.error("Erro pipeline:", err);
      toast.error("Erro ao iniciar pipeline. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Pipeline IA Ativo — Runway + ElevenLabs
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
          Crie vídeos que{" "}
          <span className="bg-gradient-to-r from-red-500 via-primary to-orange-500 bg-clip-text text-transparent">
            vendem por você
          </span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto">
          Vídeos cinematográficos com IA em segundos. Upload da imagem, roteiro automático, voz profissional e vídeo pronto.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            onClick={onOpenGenerator}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-lg px-8 py-6 rounded-xl shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] transition-all hover:shadow-[0_0_40px_-5px_rgba(239,68,68,0.7)] hover:scale-105"
          >
            <Play className="w-5 h-5 mr-2" />
            Gerar Vídeo Cinematográfico
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleQuickGenerate}
            disabled={loading}
            className="w-full sm:w-auto border-border/50 text-muted-foreground hover:text-foreground px-8 py-6 rounded-xl"
          >
            {loading ? "⏳ Gerando..." : "🚀 Gerar Teste Rápido"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
