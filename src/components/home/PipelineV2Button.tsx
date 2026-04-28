import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Zap, Download, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderVideoV2 } from "@/lib/renderVideoV2";
import { usePlan } from "@/hooks/usePlan";
import { buildViralVariations } from "@/lib/viralHooks";
import CapCutButton from "@/components/CapCutButton";

/**
 * Botão "modo máquina": orquestra Copy → Voz → Trilha → Render.
 * Estilo: Secondary Premium (roxo/azul frio) — hierarquia abaixo do CTA principal.
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
    <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
      {/* ── PRIMARY: Pipeline V2 (PRO) ── */}
      <button
        onClick={run}
        disabled={loading}
        className="group relative inline-flex items-center justify-center gap-2.5
          h-[48px] px-7 rounded-[14px]
          font-semibold text-[14px] text-white
          bg-gradient-to-r from-[#6a5cff] via-[#7c3aed] to-[#8b5cf6]
          shadow-[0_0_18px_-5px_rgba(124,58,237,0.35)]
          transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]
          hover:shadow-[0_0_28px_-4px_rgba(124,58,237,0.55)] hover:-translate-y-[2px] hover:scale-[1.03]
          active:scale-[0.97] active:shadow-[0_0_12px_-3px_rgba(124,58,237,0.3)]
          disabled:opacity-40 disabled:pointer-events-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Gerando... {progress > 0 ? `${progress}%` : ""}</span>
          </>
        ) : (
          <>
            <Zap className="w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110" />
            <span>Modo Máquina V2 {isPro ? "(PRO)" : ""}</span>
          </>
        )}
      </button>

      {/* ── TERTIARY: Viral 10x (Premium only) ── */}
      {isPremium && (
        <button
          onClick={runViral}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2
            h-9 px-4 rounded-lg
            font-medium text-[12px] text-rose-400
            bg-rose-500/[0.06] border border-rose-500/[0.12]
            transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
            hover:bg-rose-500/[0.12] hover:text-rose-300 hover:border-rose-500/[0.2] hover:-translate-y-[1px]
            active:scale-[0.97]
            disabled:opacity-40 disabled:pointer-events-none"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Modo Viral 10x (Premium)</span>
        </button>
      )}

      {/* Progress bar */}
      {loading && (
        <div className="w-full max-w-[16rem] mt-1">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Results */}
      {videoUrl && !variations.length && (
        <div className="flex flex-col gap-2 mt-1 items-center">
          <a href={videoUrl} download="seu-video-pronto.webm">
            <button className="inline-flex items-center gap-2 h-9 px-4 rounded-lg font-medium text-[13px] text-foreground bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-all">
              <Download className="w-4 h-4" />
              Baixar vídeo
            </button>
          </a>
          <CapCutButton videoUrl={videoUrl} />
        </div>
      )}

      {variations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          {variations.map((u, i) => (
            <a key={i} href={u} download={`viral-${i + 1}.webm`}>
              <button className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg font-medium text-[12px] text-foreground bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] transition-all w-full">
                <Download className="w-3 h-3" />
                #{i + 1}
              </button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
