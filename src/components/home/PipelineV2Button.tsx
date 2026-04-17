import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderVideoV2 } from "@/lib/renderVideoV2";

/**
 * Botão "modo máquina": chama orchestrate-video-v2 e renderiza o MP4 no front.
 * Sem dependência de CapCut. Sem render externo.
 */
export default function PipelineV2Button() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setProgress(0);
    setVideoUrl(null);
    try {
      toast.info("⚡ Pipeline V2: gerando roteiro + voz...");

      const { data, error } = await supabase.functions.invoke("orchestrate-video-v2", {
        body: {
          produto: "Produto premium de alta conversão",
          nicho: "saúde",
          estilo: "vsl_agressivo",
          objetivo: "vendas",
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "pipeline failed");

      toast.success(`Voz: ${data.voiceProvider}. Renderizando...`);

      const { url } = await renderVideoV2({
        script: data.script,
        audioUrl: data.audioUrl,
        trilha: data.trilha,
        onProgress: (r) => setProgress(Math.round(r * 100)),
      });

      setVideoUrl(url);
      toast.success("🎬 Vídeo pronto!");
    } catch (e) {
      console.error("[PipelineV2]", e);
      toast.error(e instanceof Error ? e.message : "Erro no pipeline V2");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto flex flex-col items-center gap-2">
      <Button
        size="lg"
        onClick={run}
        disabled={loading}
        className="w-full sm:w-auto bg-gradient-to-r from-primary to-destructive hover:opacity-90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]"
      >
        <Zap className="w-5 h-5 mr-2" />
        {loading ? `Gerando... ${progress}%` : "⚡ Modo Máquina V2"}
      </Button>

      {loading && (
        <div className="w-full sm:w-64">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {videoUrl && (
        <a href={videoUrl} download="seu-video-pronto.webm">
          <Button variant="outline" size="sm" className="mt-1">
            <Download className="w-4 h-4 mr-2" />
            Baixar vídeo
          </Button>
        </a>
      )}
    </div>
  );
}
