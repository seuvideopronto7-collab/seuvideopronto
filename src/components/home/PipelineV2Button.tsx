import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Download, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderVideoV2 } from "@/lib/renderVideoV2";
import { usePlan } from "@/hooks/usePlan";
import { buildViralVariations } from "@/lib/viralHooks";
import CapCutButton from "@/components/CapCutButton";

/**
 * Botão "modo máquina": orquestra Copy → Voz → Trilha → Render.
 * - FREE/START: Render no browser (Canvas + MediaRecorder)
 * - PRO/PREMIUM: Render via Shotstack (edge function)
 * - PREMIUM: Modo Viral 10x (10 variações de hook)
 */
export default function PipelineV2Button() {
  const { planId } = usePlan();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);

  const isPro = planId === "pro" || planId === "premium";
  const isPremium = planId === "premium";

  const orquestrar = async () => {
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
    return data;
  };

  const renderBrowser = async (script: string, audioUrl: string, trilha: string) => {
    const { url } = await renderVideoV2({
      script,
      audioUrl,
      trilha,
      onProgress: (r) => setProgress(Math.round(r * 100)),
    });
    return url;
  };

  const renderPro = async (script: string, audioUrl: string, trilha: string) => {
    const { data, error } = await supabase.functions.invoke("render-video-pro", {
      body: { script, audioUrl, trilha, plan: planId },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "shotstack failed");
    toast.success(`🎬 Render PRO iniciado (id: ${data.renderId?.slice(0, 8)})`);
    // Shotstack é assíncrono — fallback: usa render browser como prévia
    return await renderBrowser(script, audioUrl, trilha);
  };

  const run = async () => {
    setLoading(true);
    setProgress(0);
    setVideoUrl(null);
    setVariations([]);
    try {
      toast.info("⚡ Pipeline V2: gerando roteiro + voz...");
      const data = await orquestrar();
      toast.success(`Voz: ${data.voiceProvider}. Renderizando...`);

      const url = isPro
        ? await renderPro(data.script, data.audioUrl, data.trilha)
        : await renderBrowser(data.script, data.audioUrl, data.trilha);

      setVideoUrl(url);
      toast.success("🎬 Vídeo pronto!");
    } catch (e) {
      console.error("[PipelineV2]", e);
      toast.error(e instanceof Error ? e.message : "Erro no pipeline V2");
    } finally {
      setLoading(false);
    }
  };

  const runViral = async () => {
    if (!isPremium) {
      toast.error("Modo Viral 10x é exclusivo do plano PREMIUM");
      return;
    }
    setLoading(true);
    setProgress(0);
    setVideoUrl(null);
    setVariations([]);
    try {
      toast.info("🔥 Modo Viral 10x: gerando 10 variações...");
      const data = await orquestrar();
      const scripts = buildViralVariations(data.script, 10);
      const urls: string[] = [];

      for (let i = 0; i < scripts.length; i++) {
        toast.info(`Renderizando ${i + 1}/10...`);
        const url = await renderBrowser(scripts[i], data.audioUrl, data.trilha);
        urls.push(url);
        setProgress(Math.round(((i + 1) / scripts.length) * 100));
      }

      setVariations(urls);
      setVideoUrl(urls[0]);
      toast.success("🔥 10 vídeos virais prontos!");
    } catch (e) {
      console.error("[Viral10x]", e);
      toast.error(e instanceof Error ? e.message : "Erro no modo viral");
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
        {loading ? `Gerando... ${progress}%` : `⚡ Modo Máquina V2 ${isPro ? "(PRO)" : ""}`}
      </Button>

      {isPremium && (
        <Button
          size="sm"
          onClick={runViral}
          disabled={loading}
          variant="outline"
          className="w-full sm:w-auto border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <Flame className="w-4 h-4 mr-2" />
          🔥 Modo Viral 10x (Premium)
        </Button>
      )}

      {loading && (
        <div className="w-full sm:w-64">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {videoUrl && !variations.length && (
        <div className="flex flex-col gap-2 mt-1 items-center">
          <a href={videoUrl} download="seu-video-pronto.webm">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Baixar vídeo
            </Button>
          </a>
          <CapCutButton videoUrl={videoUrl} />
        </div>
      )}

      {variations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          {variations.map((u, i) => (
            <a key={i} href={u} download={`viral-${i + 1}.webm`}>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="w-3 h-3 mr-1" />
                #{i + 1}
              </Button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
