import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Wand2, Copy, Download, Sparkles, Mic2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { createVideoJob, fetchVideoJob, startVideoPipeline } from "@/services/api";
import { buscarAPI } from "@/lib/apiRegistry";
import { renderVideoFromImage } from "@/lib/videoRender";
import { generateEpicSoundtrack } from "@/lib/audioSynth";
import { buildCinematicPrompt } from "@/lib/buildCinematicPrompt";
import { buildScript } from "@/lib/buildScript";
import { usePlan } from "@/hooks/usePlan";

const productTypes = ["Natural", "Suplemento", "Cosmetico", "Tecnologia", "Outro"];
const styleTypes = ["Luxo", "Fitness", "Saude", "Tecnologia"];

const finalStatuses = new Set(["completed", "failed", "fallback", "error"]);
const objectives = ["Vendas", "Viral", "Autoridade", "Cinematográfico"];

type ScriptData = {
  hook: string;
  benefits: string[];
  cta: string;
  fullScript: string;
  onScreenText: string[];
  isFallback?: boolean;
};

const VideoGeneratorUI = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [niche, setNiche] = useState<string>("");
  const [objective, setObjective] = useState<string>(objectives[0]);
  const [productType, setProductType] = useState(productTypes[0]);
  const [styleType, setStyleType] = useState(styleTypes[0]);
  const [useDarkflow, setUseDarkflow] = useState(false);
  const [useViral, setUseViral] = useState(false);
  const [modePro, setModePro] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isDetectingNiche, setIsDetectingNiche] = useState(false);
  const [scriptData, setScriptData] = useState<ScriptData | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [apiChecks, setApiChecks] = useState<Array<{ name: string; status: "ok" | "error"; message?: string }>>([]);
  const [isCheckingApis, setIsCheckingApis] = useState(false);
  const [narrationText, setNarrationText] = useState("");
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [isLocalRendering, setIsLocalRendering] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const lastRealtimeStatusRef = useRef<string | null>(null);
  const { planId } = usePlan();

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (narrationUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(narrationUrl);
      }
      if (musicUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(musicUrl);
      }
    };
  }, [narrationUrl, musicUrl]);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const watchdog = window.setTimeout(() => {
      if (!active) return;
      console.error("PDG DEBUG: erro detectado e tratado", new Error("Timeout de monitoramento do job"));
      setJobStatus("fallback");
      setProgress((prev) => (prev < 100 ? 100 : prev));
      active = false;
    }, 60000);

    const syncJob = async () => {
      try {
        const job = await fetchVideoJob(jobId);
        if (!active || !job) return;
        setJobStatus(job.status || null);
        setProgress(job.progress ?? 0);
        setVideoUrl(job.video_url || null);
        if (job.status && finalStatuses.has(job.status)) {
          active = false;
        }
      } catch (error) {
        console.error("PDG DEBUG: erro detectado e tratado", error);
      }
    };

    syncJob();

    const channel = supabase
      .channel("video_jobs")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "video_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (!active) return;
          const job = payload.new as any;
          const nextStatus = job.status || null;
          setJobStatus(nextStatus);
          setProgress(job.progress ?? 0);
          setVideoUrl(job.video_url || null);
          if (nextStatus && nextStatus !== lastRealtimeStatusRef.current) {
            if (job.status === "completed") toast.success("\ud83c\udfac V\u00eddeo pronto!");
            if (nextStatus === "error" || nextStatus === "failed") {
              toast.error(job.error || "Erro no processamento");
            }
            if (nextStatus === "fallback") {
              toast.warning("Fallback aplicado no processamento");
            }
            lastRealtimeStatusRef.current = nextStatus;
          }
          if (nextStatus && finalStatuses.has(nextStatus)) {
            active = false;
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      window.clearTimeout(watchdog);
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  useEffect(() => {
    const runChecks = async () => {
      setIsCheckingApis(true);
      const results: Array<{ name: string; status: "ok" | "error"; message?: string }> = [];
      const apis = [
        { key: "elevenlabs", label: "ElevenLabs (voz)" },
        { key: "runway", label: "Runway (vídeo)" },
        { key: "pika", label: "Pika (vídeo)" },
      ];

      apis.forEach((api) => {
        const entry = buscarAPI(api.key);
        if (!entry?.conectado) {
          results.push({ name: api.label, status: "error", message: "API desconectada" });
        } else {
          results.push({ name: api.label, status: "ok" });
        }
      });

      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/webhook/health", { signal: controller.signal });
        window.clearTimeout(timer);
        if (!res.ok) throw new Error(`Webhook indisponível (${res.status})`);
        results.push({ name: "Backend webhook", status: "ok" });
      } catch (error: any) {
        results.push({ name: "Backend webhook", status: "error", message: error?.message || "Sem resposta" });
      }

      setApiChecks(results);
      setIsCheckingApis(false);
    };

    runChecks();
  }, []);

  const shortText = (value: string, max = 36) => {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) return "";
    if (clean.length <= max) return clean;
    return `${clean.slice(0, Math.max(1, max - 3))}...`;
  };

  const buildOnScreenText = (hook: string, benefits: string[], cta: string) => {
    const raw = [hook, ...benefits, cta].filter(Boolean);
    const unique = Array.from(new Set(raw.map((item) => shortText(item))));
    return unique.slice(0, 6);
  };

  const buildFallbackScript = () => {
    const baseScript = buildScript(productType.toLowerCase(), styleType.toLowerCase());
    const hook = baseScript.split(".")[0]?.trim() || "Apresentacao premium que prende no primeiro olhar.";
    const benefits = [
      "Impacto visual imediato",
      "Valor percebido premium",
      "Conversao com estilo comercial",
    ];
    const cta = "Garanta o seu agora.";
    const onScreenText = buildOnScreenText(hook, benefits, cta);
    return { hook, benefits, cta, fullScript: baseScript, onScreenText, isFallback: true } as ScriptData;
  };

  const generateScript = async () => {
    setIsGeneratingScript(true);
    try {
      const objectiveLabel = objective || objectives[0];
      const isCinematic = objectiveLabel === "Cinematográfico";
      const response = await supabase.functions.invoke("generate-viral", {
        body: {
          tipo: isCinematic ? "cinematografico" : "roteiro",
          produto: productName || productType,
          nicho: niche || styleType,
          publico: "Compradores premium",
          objetivo: modePro
            ? `${objectiveLabel} | PRO: storytelling, cenas simuladas, CTA agressivo`
            : objectiveLabel,
          marca: brandName || undefined,
          modo: isCinematic ? "cinematografico" : "comercial",
        },
      });

      if (response.error) throw response.error;

      const payload = response.data || {};
      
      if (isCinematic) {
        const falas = payload?.falas || [];
        const hookFala = falas.find((f: any) => f.tipo === "GANCHO");
        const ctaFala = falas.find((f: any) => f.tipo === "CTA");
        const hook = hookFala?.texto || payload?.ganchos_alternativos?.[0]?.texto || "Gancho cinematográfico";
        const cta = ctaFala?.texto || "Clique e garanta o seu agora.";
        const benefits = falas
          .filter((f: any) => !["GANCHO", "CTA"].includes(f.tipo))
          .slice(0, 3)
          .map((f: any) => f.texto);
        const fullScript = payload?.roteiro_completo || falas.map((f: any) => `[${f.tempo}] ${f.texto}`).join("\n");
        const onScreenText = (payload?.cenas || []).map((c: any) => c.texto_tela).filter(Boolean).slice(0, 6);
        const result = { hook, benefits, cta, fullScript, onScreenText } as ScriptData;
        setScriptData(result);
        if (fullScript) setNarrationText(fullScript);
        return result;
      }

      const roteiro = payload?.roteiro || payload?.result?.roteiro || {};
      const hook = roteiro?.hook || payload?.hook || "Seu produto precisa parecer premium agora.";
      const cta = roteiro?.cta || payload?.cta || "Clique e garanta o seu agora.";
      const benefitsCandidate = [roteiro?.dor, roteiro?.identificacao, roteiro?.solucao].filter(Boolean);
      const baseBenefits = [
        "Resultado comercial imediato",
        "Impacto visual com prova",
        "Conversao elevada no feed",
      ];
      const benefits = [...benefitsCandidate, ...baseBenefits].slice(0, 3);
      const fullScript =
        payload?.roteiro_completo ||
        payload?.roteiroCompleto ||
        roteiro?.roteiro_completo ||
        buildScript(productType.toLowerCase(), styleType.toLowerCase());
      const onScreenText = buildOnScreenText(hook, benefits, cta);
      const result = { hook, benefits, cta, fullScript, onScreenText } as ScriptData;
      setScriptData(result);
      return result;
    } catch (error) {
      console.error("Erro ao gerar roteiro:", error);
      const fallback = buildFallbackScript();
      setScriptData(fallback);
      return fallback;
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const detectNiche = async () => {
    setIsDetectingNiche(true);
    try {
      const resolvedImageUrl = await uploadToStorage();
      if (resolvedImageUrl) {
        const { data, error } = await supabase.functions.invoke("analyze-content", {
          body: {
            fileUrl: resolvedImageUrl,
            modo: "vendas",
            produto: productName || productType,
            nicho: niche || styleType,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const tema = data?.analise?.tema || data?.novo_roteiro?.hook || "";
        if (tema) {
          setNiche(String(tema).trim());
          toast.success("Nicho detectado.");
          return;
        }
      }

      const response = await supabase.functions.invoke("generate-viral", {
        body: {
          tipo: "seo",
          produto: productName || productType,
          nicho: niche || styleType,
          publico: "Compradores premium",
          objetivo: objective,
        },
      });

      if (response.error) throw response.error;
      const payload = response.data || {};
      const keyword =
        payload?.palavras_chave?.[0] ||
        payload?.titulos?.[0] ||
        payload?.tags_youtube?.split(",")?.[0];
      if (keyword) {
        setNiche(keyword.replace(/#/g, "").trim());
        toast.success("Nicho detectado.");
      } else {
        toast.error("Nao foi possivel detectar o nicho.");
      }
    } catch (error) {
      console.error("Erro ao detectar nicho:", error);
      toast.error("Falha ao detectar nicho.");
    } finally {
      setIsDetectingNiche(false);
    }
  };

  const handleFile = (next?: File | null) => {
    if (!next) return;
    if (!/[.](jpg|jpeg|png|webp)$/i.test(next.name)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(next);
    setFile(next);
    setPreviewUrl(url);
    setFileSize(`${(next.size / (1024 * 1024)).toFixed(2)} MB`);
    setResolution(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    handleFile(dropped);
  };

  const uploadToStorage = async () => {
    if (!file) return imageUrl.trim();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `admin-generator/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media-uploads").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("media-uploads").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const cinematicPrompt = useMemo(
    () => buildCinematicPrompt(productType, styleType, useDarkflow, useViral, modePro),
    [productType, styleType, useDarkflow, useViral, modePro],
  );

  const supabaseFunctionHeaders = () => {
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  };

  const runAutoScript = async () => {
    try {
      setIsGeneratingScript(true);
      const resolvedImageUrl = await uploadToStorage();
      if (!resolvedImageUrl) {
        toast.error("Informe uma URL ou envie uma imagem.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: {
          fileUrl: resolvedImageUrl,
          modo: "vendas",
          produto: productName || undefined,
          nicho: niche || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const tema = data?.analise?.tema || niche;
      const hook = data?.novo_roteiro?.hook || data?.nova_copy?.headline || "Gancho forte";
      const benefits = (data?.nova_copy?.bullet_points || []).slice(0, 3);
      const cta = data?.novo_roteiro?.cta || data?.nova_copy?.cta_texto || "Clique e veja agora";
      const roteiroCompleto = data?.novo_roteiro?.roteiro_completo || data?.novo_roteiro?.abertura || "";
      const textosTela = (data?.novas_cenas || [])
        .map((cena: any) => cena?.texto_tela)
        .filter(Boolean);

      if (tema) setNiche(tema);
      setScriptData({ hook, benefits, cta, fullScript: roteiroCompleto, onScreenText: textosTela });
      if (roteiroCompleto) setNarrationText(roteiroCompleto);
      toast.success("Roteiro e textos gerados.");
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      setScriptData({
        hook: "Pare tudo e veja isso agora",
        benefits: ["Benefício 1", "Benefício 2", "Benefício 3"],
        cta: "Clique para saber mais",
        fullScript: "Hook forte, benefícios diretos e CTA agressivo.",
        onScreenText: ["HOOK FORTE", "3 BENEFÍCIOS", "CTA DIRETO"],
      });
      setNarrationText("Se você busca resultados, precisa ver isso agora.");
      toast.warning("Falha ao gerar roteiro. Fallback aplicado.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateVoiceover = async () => {
    if (!narrationText.trim()) {
      toast.error("Digite ou gere um texto de narração.");
      return;
    }
    try {
      setIsGeneratingVoice(true);
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-voiceover`;
      const response = await fetch(url, {
        method: "POST",
        headers: supabaseFunctionHeaders(),
        body: JSON.stringify({ text: narrationText }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Falha ao gerar narração");
      }
      const blob = await response.blob();
      if (narrationUrl?.startsWith("blob:")) URL.revokeObjectURL(narrationUrl);
      setNarrationUrl(URL.createObjectURL(blob));
      toast.success("Narração gerada.");
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      toast.error(error?.message || "Falha ao gerar narração.");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const generateSoundtrack = async () => {
    try {
      setIsGeneratingMusic(true);
      const audioBuffer = await generateEpicSoundtrack(8);
      const blob = new Blob([audioBuffer], { type: "audio/wav" });
      if (musicUrl?.startsWith("blob:")) URL.revokeObjectURL(musicUrl);
      setMusicUrl(URL.createObjectURL(blob));
      toast.success("Trilha sonora gerada.");
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      toast.error(error?.message || "Falha ao gerar trilha sonora.");
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const renderLocalVideo = async () => {
    try {
      setIsLocalRendering(true);
      setLocalProgress(0);
      setJobStatus("render_local");
      setProgress(0);
      const resolvedImageUrl = await uploadToStorage();
      if (!resolvedImageUrl) {
        toast.error("Informe uma URL ou envie uma imagem.");
        return;
      }
      const url = await renderVideoFromImage(resolvedImageUrl, {
        durationSec: 6,
        fps: 30,
        animation: useViral ? "zoom-in" : "kenburns",
        narrationUrl: narrationUrl || undefined,
        musicUrl: musicUrl || undefined,
        narrationVolume: 1,
        musicVolume: 0.35,
        enableDucking: true,
        onProgress: (ratio) => setLocalProgress(Math.round(ratio * 100)),
      });
      setVideoUrl(url);
      setJobStatus("completed");
      setProgress(100);
      toast.success("Render local concluído.");
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      toast.error(error?.message || "Falha ao renderizar localmente.");
    } finally {
      setIsLocalRendering(false);
    }
  };

  const startJob = async () => {
    try {
      setIsProcessing(true);
      setVideoUrl(null);
      setProgress(0);
      setJobStatus("queued");

      const resolvedImageUrl = await uploadToStorage();
      if (!resolvedImageUrl) {
        toast.error("Informe uma URL ou envie uma imagem.");
        return;
      }

      const script = await generateScript();
      const prompt = buildCinematicPrompt(productType, styleType, useDarkflow, useViral, modePro);

      // Build scenes from script
      const scenesFromScript = (script?.onScreenText || []).map((text, i) => ({
        texto: text,
        visual: `scene ${i + 1} for ${productType}`,
        emocao: ["curiosidade", "tensão", "solução", "urgência"][Math.min(i, 3)],
        prompt_imagem: `${prompt}, scene: ${text}`,
      }));

      // Ensure at least 4 scenes
      while (scenesFromScript.length < 4) {
        scenesFromScript.push({
          texto: script?.cta || "Garanta o seu agora",
          visual: `product premium shot`,
          emocao: "urgência",
          prompt_imagem: `${prompt}, premium product close-up`,
        });
      }

      // Create job in DB first
      const createResponse = await createVideoJob({
        imageUrl: resolvedImageUrl,
        productType,
        style: styleType,
        useDarkflow,
        useViral,
        prompt,
        modePro,
        script,
        textoNaTela: script?.onScreenText || [],
        narracao: narrationText || script?.fullScript || "",
      });

      const id = createResponse?.jobId;
      if (!id) throw new Error("Job nao retornado pelo servidor.");
      setJobId(id);
      setJobStatus("pending");

      // Start the full pipeline (images → audio → render)
      startVideoPipeline({
        jobId: id,
        imageUrl: resolvedImageUrl,
        script: narrationText || script?.fullScript || "",
        scenes: scenesFromScript,
      }).catch((err) => {
        console.error("Pipeline async error:", err);
        // Status updates come via realtime, no need to block
      });

      toast.success("Pipeline iniciado! Acompanhe o progresso.");
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      toast.error(error?.message || "Falha ao iniciar o job.");
      setJobStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const progressLabel = useMemo(() => {
    if (!jobStatus) return "Aguardando";
    if (jobStatus === "done" || jobStatus === "completed") return "Concluído";
    if (jobStatus === "failed" || jobStatus === "error") return "Erro";
    if (jobStatus === "fallback") return "Fallback";
    if (jobStatus === "render_local") return "Render local";
    if (jobStatus === "generating_images") return "Gerando cenas";
    if (jobStatus === "generating_audio") return "Gerando narração";
    if (jobStatus === "rendering") return "Montando vídeo";
    if (jobStatus === "generating_script") return "Gerando roteiro";
    if (jobStatus === "generating_voice") return "Gerando voz";
    if (jobStatus === "generating_video") return "Gerando vídeo";
    return jobStatus.replace(/_/g, " ");
  }, [jobStatus]);

  const statusMessage = useMemo(() => {
    if (!jobStatus) return "Aguardando início do job";
    if (jobStatus === "generating_images") return "🎨 Gerando imagens cinematográficas das cenas...";
    if (jobStatus === "generating_audio") return "🎙️ Gerando narração com voz premium...";
    if (jobStatus === "rendering") return "🎬 Montando vídeo final com Shotstack...";
    if (jobStatus === "generating_script") return "📝 Criando roteiro com IA...";
    if (jobStatus === "generating_voice") return "🎙️ Sintetizando voz...";
    if (jobStatus === "generating_video") return "🎥 Gerando vídeo...";
    if (jobStatus === "processing") return "⚙️ Processando...";
    if (jobStatus === "done" || jobStatus === "completed") return "✅ Vídeo pronto para visualização";
    if (jobStatus === "failed" || jobStatus === "error") return "❌ Falha no processamento";
    if (jobStatus === "fallback") return "⚠️ Fallback aplicado automaticamente";
    if (jobStatus === "render_local") return "🖥️ Render local em andamento";
    return "⏳ Processamento em andamento";
  }, [jobStatus]);

  const progressValue = isLocalRendering ? localProgress : progress;

  const apiErrors = useMemo(() => apiChecks.filter((item) => item.status === "error"), [apiChecks]);

  const downloadVideo = () => {
    if (!videoUrl) return;
    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "video-final.mp4";
    link.click();
  };

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      <section className="space-y-6">
        {(isCheckingApis || apiErrors.length > 0) && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-100">
            <div className="font-semibold">Status de APIs e webhook</div>
            {isCheckingApis && <div className="mt-1 text-red-200">Validando conexões...</div>}
            {apiErrors.length > 0 && (
              <div className="mt-2 space-y-1">
                {apiErrors.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span>{item.name}</span>
                    <span className="text-red-200">{item.message || "Sem resposta"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Imagem de referência</h2>
              <p className="text-xs text-muted-foreground">URL pública ou upload direto</p>
            </div>
            <Badge variant="secondary">Etapa 1</Badge>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Cole a URL da imagem"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
            <div
              className="border border-dashed border-border/60 rounded-2xl p-6 text-center bg-muted/20"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                id="cinema-upload"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <label htmlFor="cinema-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-sm">Arraste e solte ou clique para enviar</span>
                <span className="text-xs text-muted-foreground">Arquivo real do produto</span>
              </label>
            </div>
          </div>
          {previewUrl && (
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="rounded-xl border border-border/50 w-full object-cover"
                onLoad={(event) => {
                  const img = event.currentTarget;
                  setResolution(`${img.naturalWidth}x${img.naturalHeight}px`);
                }}
              />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arquivo</span>
                  <span>{file?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tamanho</span>
                  <span>{fileSize}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resolução</span>
                  <span>{resolution || "Carregando"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Briefing do produto</h2>
              <p className="text-xs text-muted-foreground">Base para roteiro e copy premium</p>
            </div>
            <Badge variant="secondary">Etapa 2</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Nome do produto"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
            />
            <Input
              placeholder="Nome da marca"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
            />
          </div>
          <Input
            placeholder="Nicho (opcional)"
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
          />
          <Button variant="glass" onClick={detectNiche} disabled={isDetectingNiche}>
            {isDetectingNiche ? "Detectando nicho..." : "Detectar nicho (IA)"}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            {objectives.map((item) => (
              <button
                key={item}
                onClick={() => setObjective(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition-all ${
                  objective === item
                    ? "border-[#22d3ee] bg-[#22d3ee]/10 text-[#22d3ee]"
                    : "border-border/50 text-muted-foreground hover:border-[#22d3ee]/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tipo do produto</h2>
              <p className="text-xs text-muted-foreground">Ajusta a estética do prompt</p>
            </div>
            <Badge variant="secondary">Etapa 3</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {productTypes.map((item) => (
              <button
                key={item}
                onClick={() => setProductType(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition-all ${
                  productType === item
                    ? "border-[#f5c451] bg-[#f5c451]/10 text-[#f5c451]"
                    : "border-border/50 text-muted-foreground hover:border-[#f5c451]/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Estilo de geração</h2>
              <p className="text-xs text-muted-foreground">Luxo, fitness, saúde ou tecnologia</p>
            </div>
            <Badge variant="secondary">Etapa 4</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {styleTypes.map((item) => (
              <button
                key={item}
                onClick={() => setStyleType(item)}
                className={`rounded-xl border px-3 py-2 text-xs transition-all ${
                  styleType === item
                    ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]"
                    : "border-border/50 text-muted-foreground hover:border-[#3b82f6]/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Modos avançados</h2>
              <p className="text-xs text-muted-foreground">Ative variações do motor</p>
            </div>
            <Badge variant="secondary">Etapa 5</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setUseDarkflow((prev) => !prev)}
              className={`rounded-xl border px-4 py-3 text-xs transition-all ${
                useDarkflow
                  ? "border-[#9333ea] bg-[#9333ea]/10 text-[#c084fc]"
                  : "border-border/50 text-muted-foreground hover:border-[#9333ea]/60"
              }`}
            >
              {useDarkflow ? "Darkflow ativado" : "Ativar Darkflow"}
            </button>
            <button
              onClick={() => setUseViral((prev) => !prev)}
              className={`rounded-xl border px-4 py-3 text-xs transition-all ${
                useViral ? "border-[#f97316] bg-[#f97316]/10 text-[#fdba74]" : "border-border/50 text-muted-foreground hover:border-[#f97316]/60"
              }`}
            >
              {useViral ? "Viral boost ativo" : "Ativar Viral boost"}
            </button>
          </div>
          <button
            onClick={() => setModePro((prev) => !prev)}
            className={`rounded-xl border px-4 py-3 text-xs transition-all ${
              modePro
                ? "border-[#f5c451] bg-[#f5c451]/10 text-[#f5c451]"
                : "border-border/50 text-muted-foreground hover:border-[#f5c451]/60"
            }`}
          >
            {modePro ? "Modo PRO ativado" : "Ativar Modo PRO"}
          </button>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Roteiro automático</h2>
              <p className="text-xs text-muted-foreground">Gancho + 3 benefícios + CTA</p>
            </div>
            <Badge variant="secondary">Etapa 6</Badge>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isGeneratingScript ? "Gerando roteiro..." : scriptData ? "Roteiro pronto" : "Aguardando"}</span>
              {scriptData?.isFallback && <span className="text-amber-400">Fallback ativo</span>}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gancho</div>
              <div className="font-medium">{scriptData?.hook || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Benefícios</div>
              <ul className="space-y-1">
                {(scriptData?.benefits || ["—", "—", "—"]).map((item, index) => (
                  <li key={`${item}-${index}`} className="text-sm">• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">CTA</div>
              <div className="font-medium">{scriptData?.cta || "—"}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-sm">
            <div className="text-xs text-muted-foreground mb-2">Texto na tela (auto)</div>
            <div className="flex flex-wrap gap-2">
              {(scriptData?.onScreenText || ["Gancho", "Beneficio 1", "Beneficio 2", "Beneficio 3", "CTA"]).map((item, index) => (
                <span key={`${item}-${index}`} className="rounded-full border border-border/60 px-3 py-1 text-xs">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Button variant="glass" onClick={generateScript} disabled={isGeneratingScript}>
            <Sparkles className="h-4 w-4" /> {isGeneratingScript ? "Gerando roteiro..." : "Gerar roteiro IA"}
          </Button>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prompt cinematográfico</h2>
              <p className="text-xs text-muted-foreground">Estilo Apple + Nike + TikTok Ads</p>
            </div>
            <Badge variant="secondary">Etapa 7</Badge>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4 text-xs leading-relaxed">
            {cinematicPrompt}
          </div>
          <Button variant="glass" onClick={() => copyText(cinematicPrompt, "Prompt")}>
            <Copy className="h-4 w-4" /> Copiar prompt
          </Button>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Narração e trilha sonora</h2>
              <p className="text-xs text-muted-foreground">Voz masculina comercial + música épica</p>
            </div>
            <Badge variant="secondary">Etapa 8</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <div className="text-muted-foreground">Voz</div>
              <div className="font-semibold">Masculina · Tom comercial · Energia alta</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
              <div className="text-muted-foreground">Trilha</div>
              <div className="font-semibold">Epica / Comercial · Volume adaptativo</div>
            </div>
          </div>
          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Texto da narração (auto)"
              value={narrationText}
              onChange={(event) => setNarrationText(event.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button variant="glass" onClick={generateVoiceover} disabled={isGeneratingVoice}>
                <Mic2 className="h-4 w-4" /> {isGeneratingVoice ? "Gerando narração..." : "Gerar narração"}
              </Button>
              <Button variant="glass" onClick={generateSoundtrack} disabled={isGeneratingMusic}>
                <Music2 className="h-4 w-4" /> {isGeneratingMusic ? "Gerando trilha..." : "Gerar trilha sonora"}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Preview narração</div>
                {narrationUrl ? (
                  <audio controls src={narrationUrl} className="w-full" />
                ) : (
                  <div className="text-xs text-muted-foreground">Nenhuma narração gerada</div>
                )}
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Preview trilha</div>
                {musicUrl ? (
                  <audio controls src={musicUrl} className="w-full" />
                ) : (
                  <div className="text-xs text-muted-foreground">Nenhuma trilha gerada</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Iniciar pipeline</h2>
              <p className="text-xs text-muted-foreground">Cria o job e executa o processamento</p>
            </div>
            <Badge variant="secondary">Etapa 9</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button variant="neon" onClick={startJob} disabled={isProcessing}>
              <Wand2 className="h-4 w-4" /> {isProcessing ? "Processando..." : "GERAR VÍDEO AGORA 🎬🔥"}
            </Button>
            <Button variant="glass" onClick={renderLocalVideo} disabled={isLocalRendering}>
              {isLocalRendering ? "Render local..." : "Renderizar localmente"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Status do job</h2>
              <p className="text-xs text-muted-foreground">Monitoramento em tempo real</p>
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{jobId ? `Job ${jobId}` : "Nenhum job ativo"}</span>
            <Badge variant="secondary">{progressLabel}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">{statusMessage}</div>
          {(jobStatus === "error" || jobStatus === "failed" || jobStatus === "fallback") && (
            <Button variant="glass" onClick={startJob} disabled={isProcessing}>
              Tentar novamente
            </Button>
          )}
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Preview</h2>
              <p className="text-xs text-muted-foreground">Vídeo final com player elegante</p>
            </div>
            <Badge variant="secondary">{videoUrl ? "Pronto" : "Aguardando"}</Badge>
          </div>
          <div className="rounded-2xl border border-border/50 bg-black/60 p-2 relative overflow-hidden">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full rounded-xl" poster={previewUrl || undefined} />
            ) : (
              <div className="rounded-xl h-52 flex items-center justify-center text-xs text-muted-foreground">
                Nenhum vídeo renderizado
              </div>
            )}
            {planId === "free" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-white/40 text-2xl font-semibold tracking-[0.4em] rotate-[-20deg]">
                  PDG
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="glass" onClick={downloadVideo} disabled={!videoUrl}>
              <Download className="h-4 w-4" /> Baixar vídeo
            </Button>
            <Button variant="glass" onClick={() => videoUrl && copyText(videoUrl, "Link do vídeo")} disabled={!videoUrl}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VideoGeneratorUI;
