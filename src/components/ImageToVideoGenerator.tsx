import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Wand2, Play, Film, Clock, ChevronDown, ChevronUp,
  Sparkles, Download, Loader2, ImageIcon, Volume2, Type, Zap,
  Target, Camera, RefreshCw, Eye, Music2, Subtitles, Check,
  Settings2, Flame, Users, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UploadBox } from "@/components/ui/upload-box";
import { ApiStatusItem, type ApiStatus } from "@/components/ui/api-status-item";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
export type Objetivo = "vendas" | "autoridade" | "engajamento";
export type Formato = "tiktok" | "shorts" | "instagram_feed" | "stories";
export type Duracao = "5s" | "15s" | "30s" | "60s" | "2min" | "4min";
export type Voz = "masculina" | "feminina";
export type Intensidade = "suave" | "medio" | "agressivo" | "black";
export type Avatar = "" | "mulher_pos_gravidez" | "mulher_30" | "homem" | "jovem" | "empreendedor";
export type EstiloCta = "urgencia" | "escassez" | "exclusividade" | "social" | "garantia";

export type Cena = {
  numero: number;
  etapa: string;
  duracao: string;
  movimento_camera: string;
  texto_tela: string;
  narracao: string;
  efeito_visual: string;
  emocao: string;
  prompt_imagem: string;
};

export type AnaliseImagem = {
  produto_detectado: string;
  nicho_detectado: string;
  cores_dominantes?: string[];
  contexto: string;
  tem_rosto?: boolean;
  estilo_sugerido: string;
};

export type Roteiro = {
  titulo: string;
  gancho: string;
  dor: string;
  promessa: string;
  prova: string;
  solucao: string;
  cta: string;
  narracao_completa: string;
};

export type Copy = {
  headline: string;
  subheadline: string;
  bullet_points: string[];
  hashtags: string[];
  ganchos_alternativos?: string[];
};

export type ConfigVideo = {
  aspect_ratio: string;
  resolucao: string;
  duracao_total: string;
  estilo_edicao: string;
  voz_sugerida: string;
};

export type PipelineResult = {
  analise_imagem: AnaliseImagem;
  roteiro: Roteiro;
  cenas: Cena[];
  copy: Copy;
  config_video: ConfigVideo;
  jobId: string | null;
};

type PipelineStep = "idle" | "uploading" | "analyzing" | "script_ready" | "generating_images" | "generating_audio" | "rendering" | "done" | "error";

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════
const objetivoConfig: Record<Objetivo, { label: string; icon: typeof Target; color: string; desc: string }> = {
  vendas: { label: "Vendas", icon: Target, color: "border-red-500/40 bg-red-500/10", desc: "CTA agressivo, conversão máxima" },
  autoridade: { label: "Autoridade", icon: Sparkles, color: "border-blue-500/40 bg-blue-500/10", desc: "Branding pessoal, expert" },
  engajamento: { label: "Engajamento", icon: Zap, color: "border-amber-500/40 bg-amber-500/10", desc: "Viral, compartilhável" },
};

const intensidadeConfig: Record<Intensidade, { label: string; icon: typeof Flame; color: string; desc: string }> = {
  suave: { label: "Suave", icon: Shield, color: "border-emerald-500/40 bg-emerald-500/10", desc: "Educativo, sem pressão" },
  medio: { label: "Médio", icon: Zap, color: "border-blue-500/40 bg-blue-500/10", desc: "Persuasivo equilibrado" },
  agressivo: { label: "Agressivo", icon: Flame, color: "border-orange-500/40 bg-orange-500/10", desc: "Gatilhos mentais fortes" },
  black: { label: "🔥 Black", icon: Flame, color: "border-red-600/40 bg-red-600/10", desc: "Máxima persuasão — 7 dígitos" },
};

const avatarConfig: { value: Avatar; label: string; icon: string }[] = [
  { value: "", label: "Auto-detectar", icon: "🎯" },
  { value: "mulher_pos_gravidez", label: "Pós-gravidez", icon: "🤰" },
  { value: "mulher_30", label: "Mulher 30+", icon: "👩" },
  { value: "homem", label: "Homem", icon: "👨" },
  { value: "jovem", label: "Jovem 18-25", icon: "🧑" },
  { value: "empreendedor", label: "Empreendedor", icon: "💼" },
];

const estiloCtaConfig: { value: EstiloCta; label: string; icon: string }[] = [
  { value: "urgencia", label: "Urgência", icon: "⏳" },
  { value: "escassez", label: "Escassez", icon: "📦" },
  { value: "exclusividade", label: "Exclusividade", icon: "👑" },
  { value: "social", label: "Prova Social", icon: "👥" },
  { value: "garantia", label: "Garantia", icon: "✅" },
];

const formatoConfig: Record<Formato, { label: string; ratio: string; icon: string }> = {
  tiktok: { label: "TikTok", ratio: "9:16", icon: "📱" },
  shorts: { label: "Shorts", ratio: "9:16", icon: "▶️" },
  instagram_feed: { label: "Feed IG", ratio: "1:1", icon: "📷" },
  stories: { label: "Stories", ratio: "9:16", icon: "📲" },
};

const duracaoOptions: { value: Duracao; label: string }[] = [
  { value: "5s", label: "5s" },
  { value: "15s", label: "15s" },
  { value: "30s", label: "30s" },
  { value: "60s", label: "1min" },
  { value: "2min", label: "2min" },
  { value: "4min", label: "4min" },
];

const etapaColors: Record<string, string> = {
  gancho: "bg-red-500/20 text-red-400 border-red-500/30",
  dor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  promessa: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  prova: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  solucao: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cta: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const movimentoIcons: Record<string, string> = {
  zoom_in: "🔍", zoom_out: "🔎", pan: "↔️", crop_inteligente: "✂️",
  reveal: "✨", before_after: "🔄", static: "📌",
};

const stepLabels: Record<PipelineStep, { label: string; icon: typeof Camera }> = {
  idle: { label: "Aguardando", icon: Camera },
  uploading: { label: "Enviando imagem...", icon: Camera },
  analyzing: { label: "Criando copy de alta conversão...", icon: Eye },
  script_ready: { label: "Roteiro pronto", icon: Type },
  generating_images: { label: "Gerando cenas...", icon: ImageIcon },
  generating_audio: { label: "Gerando narração...", icon: Volume2 },
  rendering: { label: "Renderizando vídeo...", icon: Film },
  done: { label: "Vídeo pronto!", icon: Check },
  error: { label: "Erro no pipeline", icon: RefreshCw },
};

const apiDefinitions = [
  { key: "elevenlabs", name: "ElevenLabs", description: "Voz e narração IA" },
  { key: "runway", name: "Runway", description: "Geração de vídeo IA" },
  { key: "shotstack", name: "Shotstack", description: "Renderização e composição" },
];

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
const ImageToVideoGenerator = () => {
  const navigate = useNavigate();

  // ── State ──
  const lastTerminalStatusRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [objetivo, setObjetivo] = useState<Objetivo>("vendas");
  const [formato, setFormato] = useState<Formato>("tiktok");
  const [duracao, setDuracao] = useState<Duracao>("60s");
  const [voz, setVoz] = useState<Voz>("masculina");
  const [produtoNome, setProdutoNome] = useState("");
  const [nicho, setNicho] = useState("");
  const [intensidade, setIntensidade] = useState<Intensidade>("agressivo");
  const [avatar, setAvatar] = useState<Avatar>("");
  const [estiloCta, setEstiloCta] = useState<EstiloCta>("urgencia");

  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API status
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiStatus>>({});

  // ── Check API statuses on mount ──
  useEffect(() => {
    checkApiStatus();
  }, []);

  async function checkApiStatus() {
    const statuses: Record<string, ApiStatus> = {};
    for (const api of apiDefinitions) {
      statuses[api.key] = "testing";
    }
    setApiStatuses({ ...statuses });

    try {
      const { data } = await supabase.functions.invoke("test-api", {
        body: {},
      });

      for (const api of apiDefinitions) {
        statuses[api.key] = data?.success ? "connected" : "disconnected";
      }
    } catch {
      for (const api of apiDefinitions) {
        statuses[api.key] = "disconnected";
      }
    }
    setApiStatuses({ ...statuses });
  }

  const invokeWithTimeout = useCallback(
    async <T,>(functionName: string, body: Record<string, unknown>, timeoutMs = 15000) => {
      let timeoutId: number | undefined;
      try {
        return await Promise.race([
          supabase.functions.invoke(functionName, { body }) as Promise<{ data: T | null; error: any }>,
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              reject(new Error("Tempo limite atingido. Tente novamente."));
            }, timeoutMs);
          }),
        ]);
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
      }
    },
    [],
  );

  const handleJobUpdate = useCallback((job: any) => {
    const nextImages = Array.isArray(job.images)
      ? job.images.filter((img: unknown): img is string => typeof img === "string" && Boolean(img))
      : [];
    const fallbackImages = nextImages.length > 0 ? nextImages : imageUrl ? [imageUrl] : [];

    setProgress(job.progress ?? 0);
    if (nextImages.length > 0) setGeneratedImages(nextImages);
    if (job.audio_url) setAudioUrl(job.audio_url);
    if (job.video_url) setVideoUrl(job.video_url);

    const statusMap: Record<string, PipelineStep> = {
      generating_images: "generating_images",
      generating_audio: "generating_audio",
      rendering: "rendering",
      done: "done",
      completed: "done",
      error: "error",
      failed: "error",
    };

    if (job.status === "done" || job.status === "completed") {
      setPipelineStep("done");
      if (lastTerminalStatusRef.current !== "done") {
        toast.success("🎬 Vídeo comercial pronto!");
        lastTerminalStatusRef.current = "done";
      }
      return true;
    }

    if ((job.status === "error" || job.status === "failed") && fallbackImages.length > 0) {
      setGeneratedImages(fallbackImages);
      setErrorMsg(job.error || "Falha na renderização final. Exibindo preview das cenas.");
      setPipelineStep("done");
      setProgress(100);
      if (lastTerminalStatusRef.current !== "fallback") {
        toast.warning("Falha no vídeo final. Exibindo preview das cenas.");
        lastTerminalStatusRef.current = "fallback";
      }
      return true;
    }

    if (job.status === "error" || job.status === "failed") {
      setErrorMsg(job.error || "Erro no processamento");
      setPipelineStep("error");
      if (lastTerminalStatusRef.current !== "error") {
        toast.error(job.error || "Erro no pipeline");
        lastTerminalStatusRef.current = "error";
      }
      return true;
    }

    if (statusMap[job.status]) setPipelineStep(statusMap[job.status]);
    return false;
  }, [imageUrl]);

  // ── Realtime + polling fallback for job updates ──
  useEffect(() => {
    if (!jobId) return;
    let active = true;
    lastTerminalStatusRef.current = null;

    const syncJob = async () => {
      try {
        const { data, error } = await supabase
          .from("video_jobs" as any)
          .select("*")
          .eq("id", jobId)
          .maybeSingle();
        if (!active || error || !data) return;
        if (handleJobUpdate(data)) active = false;
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    syncJob();

    const pollInterval = window.setInterval(() => {
      if (active) syncJob();
    }, 3000);

    const channel = supabase
      .channel(`job-${jobId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "video_jobs",
        filter: `id=eq.${jobId}`,
      }, (payload) => {
        if (!active) return;
        if (handleJobUpdate(payload.new as any)) active = false;
      })
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [jobId, handleJobUpdate]);

  // ── File handling ──
  const handleFile = useCallback((f: File) => {
    if (!/\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      toast.error("Envie JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 20MB).");
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    lastTerminalStatusRef.current = null;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setImageUrl("");
    setResult(null);
    setVideoUrl(null);
    setJobId(null);
    setGeneratedImages([]);
    setAudioUrl(null);
    setErrorMsg(null);
    setPipelineStep("idle");
    setProgress(0);
  }, [previewUrl]);

  // ── Upload to storage ──
  const uploadImage = async (): Promise<string> => {
    if (!file) throw new Error("Nenhuma imagem");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `commercial/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media-uploads").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Step 1: Analyze + Generate Script ──
  const analyzeAndGenerate = async () => {
    if (!file) {
      toast.error("Envie uma imagem primeiro.");
      return;
    }

    lastTerminalStatusRef.current = null;
    setResult(null);
    setVideoUrl(null);
    setGeneratedImages([]);
    setAudioUrl(null);
    setJobId(null);
    setPipelineStep("uploading");
    setProgress(5);
    setErrorMsg(null);

    try {
      setProgress(10);
      const uploadedUrl = await uploadImage();
      setImageUrl(uploadedUrl);

      setPipelineStep("analyzing");
      setProgress(20);

      const { data, error } = await invokeWithTimeout<PipelineResult & { jobId: string; error?: string; message?: string }>(
        "generate-commercial-video",
        {
          imageUrl: uploadedUrl,
          objetivo,
          formato,
          duracao,
          produtoNome: produtoNome.trim(),
          nicho: nicho.trim(),
          intensidade,
          avatar,
          estiloCta,
          step: "analyze",
        },
        15000,
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      if (!data?.jobId) throw new Error("Job não retornado pela análise.");

      setResult(data as PipelineResult);
      setJobId(data.jobId);
      setProgress(25);
      setPipelineStep("script_ready");
      toast.success("Roteiro comercial gerado!");
    } catch (err: any) {
      const message = err?.message || "Erro na análise";
      console.error("Analyze error:", err);
      setErrorMsg(message);
      setPipelineStep("error");
      toast.error(message);
    }
  };

  // ── Step 2: Full render pipeline ──
  const startRender = async () => {
    if (!result || !jobId || !imageUrl) {
      toast.error("Gere o roteiro primeiro.");
      return;
    }

    lastTerminalStatusRef.current = null;
    setErrorMsg(null);
    setPipelineStep("generating_images");
    setProgress(30);

    try {
      const { data, error } = await invokeWithTimeout<any>(
        "generate-commercial-video",
        {
          imageUrl,
          step: "render",
          jobId,
          scenes: result.cenas || [],
          script: result.roteiro?.narracao_completa || "",
          voz,
          formato,
          duracao,
        },
        15000,
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      if (data?.images) setGeneratedImages(data.images);
      if (data?.audioUrl) setAudioUrl(data.audioUrl);
      if (data?.videoUrl) {
        setVideoUrl(data.videoUrl);
        setPipelineStep("done");
        setProgress(100);
        return;
      }
      if (data?.fallback) {
        setErrorMsg(data.message || "Preview gerado com fallback.");
        setPipelineStep("done");
        setProgress(100);
        toast.warning(data.message || "Preview gerado (renderizador indisponível).");
        return;
      }

      setPipelineStep("rendering");
      setProgress((prev) => Math.max(prev, 65));
      toast.info("Render iniciado. Acompanhe o progresso automático.");
    } catch (err: any) {
      const message = err?.message || "Erro na renderização";
      console.error("Render error:", err);

      if (message.includes("Tempo limite")) {
        setErrorMsg("Processamento mais lento que o normal. Continuaremos acompanhando automaticamente.");
        setPipelineStep("rendering");
        setProgress((prev) => Math.max(prev, 65));
        toast.warning("O render continua no backend. Acompanhe o progresso abaixo.");
        return;
      }

      const fallbackImages = generatedImages.length > 0 ? generatedImages : imageUrl ? [imageUrl] : [];
      if (fallbackImages.length > 0) {
        setGeneratedImages(fallbackImages);
        setErrorMsg(message);
        setPipelineStep("done");
        setProgress(100);
        toast.warning("Falha ao finalizar o vídeo. Exibindo preview das cenas.");
        return;
      }

      setErrorMsg(message);
      setPipelineStep("error");
      toast.error(message);
    }
  };

  // ── Retry ──
  const retry = () => {
    lastTerminalStatusRef.current = null;
    setErrorMsg(null);
    if (result) {
      startRender();
    } else {
      analyzeAndGenerate();
    }
  };

  const isProcessing = !["idle", "script_ready", "done", "error"].includes(pipelineStep);
  const StepIcon = stepLabels[pipelineStep].icon;

  return (
    <div className="w-full h-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* API Status Section */}
        <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Status das APIs</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={checkApiStatus}>
              <RefreshCw className="w-3 h-3 mr-1" /> Testar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {apiDefinitions.map((api) => (
              <ApiStatusItem
                key={api.key}
                name={api.name}
                description={api.description}
                status={apiStatuses[api.key] || "disconnected"}
                onConnect={() => navigate("/apis")}
              />
            ))}
          </div>
        </div>

        {/* Pipeline Status Bar */}
        {pipelineStep !== "idle" && (
          <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StepIcon className={`w-4 h-4 ${pipelineStep === "error" ? "text-destructive" : pipelineStep === "done" ? "text-emerald-400" : "text-primary animate-pulse"}`} />
                <span className="text-sm font-medium text-foreground">{stepLabels[pipelineStep].label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex gap-1 pt-1">
              {(["uploading", "analyzing", "script_ready", "generating_images", "generating_audio", "rendering", "done"] as PipelineStep[]).map((s) => {
                const stepOrder = ["uploading", "analyzing", "script_ready", "generating_images", "generating_audio", "rendering", "done"];
                const currentIdx = stepOrder.indexOf(pipelineStep);
                const thisIdx = stepOrder.indexOf(s);
                const isDone = thisIdx < currentIdx || pipelineStep === "done";
                const isActive = thisIdx === currentIdx;
                return (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      isDone ? "bg-emerald-500" : isActive ? "bg-primary animate-pulse" : "bg-border/30"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ═══ LEFT: Config Panel ═══ */}
          <div className="space-y-4 w-full min-w-0">
            {/* Upload Area */}
            <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" /> Imagem de Referência
              </h3>
              <UploadBox
                previewUrl={previewUrl}
                onFile={handleFile}
                disabled={isProcessing}
              />
            </div>

            {/* Produto & Nicho */}
            <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Detalhes do Produto</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Produto</label>
                  <input
                    type="text" value={produtoNome} onChange={e => setProdutoNome(e.target.value)}
                    placeholder="Ex: Sérum facial"
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Nicho</label>
                  <input
                    type="text" value={nicho} onChange={e => setNicho(e.target.value)}
                    placeholder="Ex: Skincare"
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Objetivo */}
            <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-3">
              <label className="text-sm font-semibold text-foreground">Objetivo</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(objetivoConfig) as [Objetivo, typeof objetivoConfig.vendas][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key} onClick={() => !isProcessing && setObjetivo(key)}
                      disabled={isProcessing}
                      className={`p-3 rounded-xl border text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        objetivo === key ? `${cfg.color} border-primary/30 shadow-md` : "border-border/20 bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${objetivo === key ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold">{cfg.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{cfg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato + Duração + Voz */}
            <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Formato</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(formatoConfig) as [Formato, typeof formatoConfig.tiktok][]).map(([key, cfg]) => (
                      <button
                        key={key} onClick={() => !isProcessing && setFormato(key)} disabled={isProcessing}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all duration-200 ${
                          formato === key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cfg.icon} {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Duração</label>
                  <div className="flex flex-wrap gap-1.5">
                    {duracaoOptions.map(opt => (
                      <button
                        key={opt.value} onClick={() => !isProcessing && setDuracao(opt.value)} disabled={isProcessing}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all duration-200 ${
                          duracao === opt.value ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Voz */}
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-2 block uppercase tracking-wider">Voz da narração</label>
                <div className="flex gap-2">
                  {(["masculina", "feminina"] as Voz[]).map(v => (
                    <button
                      key={v} onClick={() => !isProcessing && setVoz(v)} disabled={isProcessing}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                        voz === v ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Volume2 className="w-3 h-3" /> {v === "masculina" ? "🎙️ Masculina" : "🎙️ Feminina"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Button */}
            {pipelineStep === "idle" && (
              <Button size="lg" className="w-full md:w-auto rounded-xl h-12 text-sm font-semibold shadow-lg" onClick={analyzeAndGenerate} disabled={!file || isProcessing}>
                <Wand2 className="w-4 h-4" /> Criar Vídeo com IA
              </Button>
            )}

            {pipelineStep === "error" && (
              <div className="space-y-2">
                {errorMsg && <p className="text-xs text-destructive bg-destructive/10 rounded-xl p-3">{errorMsg}</p>}
                <Button variant="outline" size="lg" className="w-full md:w-auto rounded-xl h-12" onClick={retry} disabled={isProcessing}>
                  <RefreshCw className="w-4 h-4" /> Tentar novamente
                </Button>
              </div>
            )}
          </div>

          {/* ═══ RIGHT: Results Panel ═══ */}
          <div className="space-y-4 w-full min-w-0">
            {/* Empty state */}
            {!result && !isProcessing && pipelineStep !== "error" && (
              <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-8 text-center space-y-3 min-h-[400px] flex flex-col items-center justify-center shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center">
                  <Film className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">O roteiro aparecerá aqui</p>
                <p className="text-[10px] text-muted-foreground/50">Suba uma imagem e clique em "Criar Vídeo com IA"</p>
              </div>
            )}

            {/* Loading state */}
            {isProcessing && !result && (
              <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-8 text-center space-y-4 min-h-[400px] flex flex-col items-center justify-center shadow-lg">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">{stepLabels[pipelineStep].label}</p>
                <p className="text-[10px] text-muted-foreground">Isso pode levar alguns segundos...</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Image Analysis Card */}
                <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Análise da Imagem</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Produto", value: result.analise_imagem?.produto_detectado },
                      { label: "Nicho", value: result.analise_imagem?.nicho_detectado },
                      { label: "Estilo", value: result.analise_imagem?.estilo_sugerido },
                      { label: "Rosto", value: result.analise_imagem?.tem_rosto ? "Sim" : "Não" },
                    ].map((item, i) => (
                      <div key={i} className="bg-background/50 rounded-xl p-2.5 border border-border/10">
                        <p className="text-muted-foreground text-[9px] uppercase tracking-wider">{item.label}</p>
                        <p className="font-medium text-xs truncate text-foreground mt-0.5">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Script Structure */}
                <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{result.roteiro?.titulo || "Roteiro"}</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { emoji: "🎯", label: "Gancho", text: result.roteiro?.gancho },
                      { emoji: "😰", label: "Dor", text: result.roteiro?.dor },
                      { emoji: "💡", label: "Promessa", text: result.roteiro?.promessa },
                      { emoji: "✅", label: "Prova", text: result.roteiro?.prova },
                      { emoji: "🚀", label: "Solução", text: result.roteiro?.solucao },
                      { emoji: "🔥", label: "CTA", text: result.roteiro?.cta },
                    ].map((item, i) => (
                      <div key={i} className="bg-background/50 rounded-xl p-3 border border-border/10">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.emoji} {item.label}</p>
                        <p className="text-xs mt-1 text-foreground">{item.text || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scenes Timeline */}
                <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Cenas ({result.cenas?.length || 0})</h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {result.config_video?.duracao_total || duracao}
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {result.cenas?.map((cena, i) => {
                      const colorClass = etapaColors[cena.etapa]?.split(" ")[0] || "bg-muted";
                      return (
                        <div
                          key={i}
                          className={`flex-1 transition-all hover:opacity-80 cursor-pointer ${colorClass}`}
                          title={`Cena ${cena.numero}: ${cena.etapa}`}
                          onClick={() => setExpandedScene(expandedScene === i ? null : i)}
                        />
                      );
                    })}
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {result.cenas?.map((cena, i) => (
                      <div key={i} className="border border-border/15 rounded-xl p-3 space-y-2 bg-background/40 transition-all duration-200 hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {generatedImages[i] ? (
                              <img src={generatedImages[i]} alt={`Cena ${cena.numero}`} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                {cena.numero}
                              </div>
                            )}
                            <Badge variant="outline" className={`text-[8px] py-0 ${etapaColors[cena.etapa] || ""}`}>
                              {cena.etapa}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{cena.duracao}</span>
                            <span className="text-[11px]" title={cena.movimento_camera}>{movimentoIcons[cena.movimento_camera] || "🎬"}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedScene(expandedScene === i ? null : i)}>
                            {expandedScene === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        </div>

                        <p className="text-xs font-medium text-foreground line-clamp-2 break-words">{cena.texto_tela}</p>

                        {expandedScene === i && (
                          <div className="space-y-2 pt-2 border-t border-border/15">
                            {generatedImages[i] && (
                              <img src={generatedImages[i]} alt={`Cena ${cena.numero}`} className="w-full rounded-xl object-cover max-h-36" />
                            )}
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Narração</p>
                              <p className="text-[11px] text-foreground mt-0.5">{cena.narracao}</p>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[9px] py-0.5">📹 {cena.movimento_camera}</Badge>
                              <Badge variant="outline" className="text-[9px] py-0.5">✨ {cena.efeito_visual}</Badge>
                              <Badge variant="outline" className="text-[9px] py-0.5">💫 {cena.emocao}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy & Hashtags */}
                {result.copy && (
                  <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">📣 Copy</h3>
                    <p className="text-xs font-semibold text-foreground">{result.copy.headline}</p>
                    <p className="text-[11px] text-muted-foreground">{result.copy.subheadline}</p>
                    <ul className="space-y-1">
                      {result.copy.bullet_points?.map((bp, i) => (
                        <li key={i} className="text-[11px] flex items-start gap-1.5 text-foreground">
                          <span className="text-primary">•</span> {bp}
                        </li>
                      ))}
                    </ul>
                    {result.copy.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.copy.hashtags.map(tag => (
                          <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Audio preview */}
                {audioUrl && (
                  <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-4 shadow-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Narração</h3>
                    </div>
                    <audio src={audioUrl} controls className="w-full h-9" />
                  </div>
                )}

                {pipelineStep === "script_ready" && (
                  <Button
                    size="lg"
                    className="w-full md:w-auto rounded-xl h-12 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                    onClick={startRender}
                    disabled={isProcessing}
                  >
                    <Play className="w-4 h-4" /> Gerar Vídeo Final
                  </Button>
                )}

                {(pipelineStep === "generating_images" || pipelineStep === "generating_audio" || pipelineStep === "rendering") && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3 shadow-lg">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                    <p className="text-sm font-medium text-foreground">{stepLabels[pipelineStep].label}</p>
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {generatedImages.length} imagens</span>
                      <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> {audioUrl ? "✓" : "..."}</span>
                      <span className="flex items-center gap-1"><Subtitles className="w-3 h-3" /> legendas</span>
                    </div>
                    {errorMsg && <p className="text-[10px] text-muted-foreground">{errorMsg}</p>}
                  </div>
                )}

                {videoUrl && pipelineStep === "done" && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-emerald-400">🎬 Vídeo Pronto!</h3>
                    </div>
                    <video src={videoUrl} controls className="w-full rounded-xl" />
                    <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full md:w-auto">
                        <Download className="w-4 h-4" /> Baixar MP4
                      </Button>
                    </a>
                  </div>
                )}

                {!videoUrl && pipelineStep === "done" && generatedImages.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 shadow-lg">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-amber-400">Preview das cenas geradas</p>
                      {errorMsg && <p className="text-[11px] text-muted-foreground">{errorMsg}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {generatedImages.map((img, i) => (
                        <img key={i} src={img} alt={`Cena ${i + 1}`} className="rounded-xl object-cover aspect-[9/16] w-full" />
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={retry} disabled={isProcessing}>
                      <RefreshCw className="w-4 h-4" /> Tentar renderizar novamente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToVideoGenerator;
