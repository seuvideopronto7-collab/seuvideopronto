import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PipelineV2Button from "./PipelineV2Button";

interface HeroSectionProps {
  onOpenGenerator: () => void;
}

const HeroSection = ({ onOpenGenerator }: HeroSectionProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleQuickGenerate = async () => {
    try {
      setLoading(true);
      toast.info("🎬 Iniciando pipeline cinematográfico...");

      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          prompt: "Produto premium com iluminação cinematográfica, câmera lenta, fundo escuro elegante, estilo Apple Ads",
          imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
          productType: "premium",
          style: "Luxo",
          createJob: true,
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

        {/* Button Groups — Premium Hierarchy */}
        <div className="flex flex-col items-center gap-4 pt-4">
          {/* PRIMARY BLOCK — Core Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenGenerator}
              className="group relative inline-flex items-center gap-2.5 h-12 px-7 rounded-[14px] font-semibold text-[15px] text-white
                bg-gradient-to-r from-red-500 via-orange-500 to-amber-500
                shadow-[0_0_20px_-4px_rgba(249,115,22,0.35)]
                transition-all duration-250 ease-out
                hover:shadow-[0_0_32px_-4px_rgba(249,115,22,0.55)] hover:-translate-y-0.5 hover:scale-[1.03]
                active:scale-[0.97] active:shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]"
            >
              <Play className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
              <span>Gerar Vídeo Cinematográfico</span>
            </button>

            <PipelineV2Button />
          </div>

          {/* SECONDARY BLOCK — Auxiliary Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={handleQuickGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-medium text-[13px] text-muted-foreground
                bg-white/[0.04] border border-white/[0.08]
                transition-all duration-200 ease-out
                hover:bg-white/[0.08] hover:text-foreground hover:border-white/[0.15] hover:-translate-y-0.5
                active:scale-[0.97]
                disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Teste Rápido</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate("/dashboard/metrics")}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl font-medium text-[13px] text-muted-foreground
                bg-white/[0.04] border border-white/[0.08]
                transition-all duration-200 ease-out
                hover:bg-white/[0.08] hover:text-foreground hover:border-white/[0.15] hover:-translate-y-0.5
                active:scale-[0.97]"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Performance</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
