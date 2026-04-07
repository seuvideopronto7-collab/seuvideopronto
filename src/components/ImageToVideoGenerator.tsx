import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Upload, Wand2, Play, Film, Clock, ChevronDown, ChevronUp,
  Sparkles, Download, Loader2, ImageIcon, Volume2, Type, Zap,
  Target, Camera, RefreshCw, Eye, Music2, Subtitles, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════
export type Objetivo = "vendas" | "autoridade" | "engajamento";
export type Formato = "tiktok" | "shorts" | "instagram_feed" | "stories";
export type Duracao = "5s" | "15s" | "30s" | "60s" | "2min" | "4min";
export type Voz = "masculina" | "feminina";

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
  uploading: { label: "Enviando imagem...", icon: Upload },
  analyzing: { label: "Analisando com IA...", icon: Eye },
  script_ready: { label: "Roteiro pronto", icon: Type },
  generating_images: { label: "Gerando cenas...", icon: ImageIcon },
  generating_audio: { label: "Gerando narração...", icon: Volume2 },
  rendering: { label: "Renderizando vídeo...", icon: Film },
  done: { label: "Vídeo pronto!", icon: Check },
  error: { label: "Erro no pipeline", icon: RefreshCw },
};

// ═══════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════
const ImageToVideoGenerator = () => {
  // ── State ──
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo>("vendas");
  const [formato, setFormato] = useState<Formato>("tiktok");
  const [duracao, setDuracao] = useState<Duracao>("60s");
  const [voz, setVoz] = useState<Voz>("masculina");
  const [produtoNome, setProdutoNome] = useState("");
  const [nicho, setNicho] = useState("");

  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Realtime subscription for job updates ──
  useEffect(() => {
    if (!jobId) return;
    let active = true;

    const channel = supabase
      .channel(`job-${jobId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "video_jobs",
        filter: `id=eq.${jobId}`,
      }, (payload) => {
        if (!active) return;
        const job = payload.new as any;
        const status = job.status as string;
        setProgress(job.progress ?? 0);

        if (job.images?.length) setGeneratedImages(job.images);
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
        if (statusMap[status]) setPipelineStep(statusMap[status]);
        if (status === "done" || status === "completed") {
          toast.success("🎬 Vídeo comercial pronto!");
        }
        if (status === "error" || status === "failed") {
          setErrorMsg(job.error || "Erro no processamento");
          toast.error(job.error || "Erro no pipeline");
        }
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [jobId]);

  // ── File handling ──
  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      toast.error("Envie JPG, PNG ou WEBP."); return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 20MB)."); return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setVideoUrl(null);
    setGeneratedImages([]);
    setAudioUrl(null);
    setErrorMsg(null);
    setPipelineStep("idle");
    setProgress(0);
  }, [previewUrl]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] || null);
  };

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
    if (!file) { toast.error("Envie uma imagem primeiro."); return; }
    setPipelineStep("uploading");
    setProgress(5);
    setErrorMsg(null);

    try {
      setPipelineStep("uploading");
      setProgress(10);
      const uploadedUrl = await uploadImage();
      setImageUrl(uploadedUrl);

      setPipelineStep("analyzing");
      setProgress(20);

      const { data, error } = await supabase.functions.invoke("generate-commercial-video", {
        body: { imageUrl: uploadedUrl, objetivo, formato, duracao, produtoNome: produtoNome || undefined, nicho: nicho || undefined, step: "analyze" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as PipelineResult);
      setJobId(data.jobId);
      setProgress(25);
      setPipelineStep("script_ready");
      toast.success("Roteiro comercial gerado!");
    } catch (err: any) {
      console.error("Analyze error:", err);
      setErrorMsg(err?.message || "Erro na análise");
      setPipelineStep("error");
      toast.error(err?.message || "Erro ao analisar imagem.");
    }
  };

  // ── Step 2: Full render pipeline ──
  const startRender = async () => {
    if (!result || !jobId || !imageUrl) {
      toast.error("Gere o roteiro primeiro."); return;
    }
    setPipelineStep("generating_images");
    setProgress(30);

    try {
      const { data, error } = await supabase.functions.invoke("generate-commercial-video", {
        body: {
          imageUrl,
          step: "render",
          jobId,
          scenes: result.cenas,
          script: result.roteiro.narracao_completa,
          voz,
          formato,
          duracao,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Final state is set via realtime subscription
      if (data?.videoUrl) {
        setVideoUrl(data.videoUrl);
        setPipelineStep("done");
        setProgress(100);
      }
      if (data?.images) setGeneratedImages(data.images);
      if (data?.audioUrl) setAudioUrl(data.audioUrl);
      if (data?.fallback) {
        setPipelineStep("done");
        setProgress(100);
        toast.warning("Preview gerado (renderizador indisponível).");
      }
    } catch (err: any) {
      console.error("Render error:", err);
      setErrorMsg(err?.message || "Erro na renderização");
      setPipelineStep("error");
      toast.error(err?.message || "Erro ao gerar vídeo.");
    }
  };

  // ── Retry ──
  const retry = () => {
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
    <div className="space-y-6">
      {/* Pipeline Status Bar */}
      {pipelineStep !== "idle" && (
        <div className="border border-border/30 rounded-xl p-3 bg-muted/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StepIcon className={`w-4 h-4 ${pipelineStep === "error" ? "text-destructive" : pipelineStep === "done" ? "text-emerald-400" : "text-primary animate-pulse"}`} />
              <span className="text-sm font-medium">{stepLabels[pipelineStep].label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          {/* Mini pipeline steps */}
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* ═══ LEFT: Config Panel ═══ */}
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className="relative border-2 border-dashed border-border/40 rounded-2xl p-5 text-center hover:border-primary/40 transition-all cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0] || null)}
            />
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="Preview" className="max-h-44 mx-auto rounded-xl object-contain" />
                <p className="text-[10px] text-muted-foreground">Clique para trocar</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Arraste ou clique para enviar</p>
                <p className="text-[10px] text-muted-foreground">JPG, PNG ou WEBP • Máx 20MB</p>
              </div>
            )}
          </div>

          {/* Produto & Nicho */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Produto</label>
              <input
                type="text" value={produtoNome} onChange={e => setProdutoNome(e.target.value)}
                placeholder="Ex: Sérum facial"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Nicho</label>
              <input
                type="text" value={nicho} onChange={e => setNicho(e.target.value)}
                placeholder="Ex: Skincare"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Objetivo</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(objetivoConfig) as [Objetivo, typeof objetivoConfig.vendas][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key} onClick={() => !isProcessing && setObjetivo(key)}
                    disabled={isProcessing}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] ${
                      objetivo === key ? `${cfg.color} border-primary/30` : "border-border/20 bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 mb-1 ${objetivo === key ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-[11px] font-semibold">{cfg.label}</p>
                    <p className="text-[9px] text-muted-foreground">{cfg.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formato + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Formato</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(formatoConfig) as [Formato, typeof formatoConfig.tiktok][]).map(([key, cfg]) => (
                  <button
                    key={key} onClick={() => !isProcessing && setFormato(key)} disabled={isProcessing}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      formato === key ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Duração</label>
              <div className="flex flex-wrap gap-1.5">
                {duracaoOptions.map(opt => (
                  <button
                    key={opt.value} onClick={() => !isProcessing && setDuracao(opt.value)} disabled={isProcessing}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
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
            <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Voz da narração</label>
            <div className="flex gap-2">
              {(["masculina", "feminina"] as Voz[]).map(v => (
                <button
                  key={v} onClick={() => !isProcessing && setVoz(v)} disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    voz === v ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Volume2 className="w-3 h-3" /> {v === "masculina" ? "🎙️ Masculina" : "🎙️ Feminina"}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          {pipelineStep === "idle" && (
            <Button size="lg" className="w-full rounded-xl h-11 text-sm font-semibold" onClick={analyzeAndGenerate} disabled={!file}>
              <Wand2 className="w-4 h-4" /> Criar Vídeo com IA
            </Button>
          )}

          {pipelineStep === "error" && (
            <div className="space-y-2">
              {errorMsg && <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">{errorMsg}</p>}
              <Button variant="outline" size="lg" className="w-full rounded-xl h-11" onClick={retry}>
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </Button>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Results Panel ═══ */}
        <div className="space-y-4">
          {/* Empty state */}
          {!result && !isProcessing && pipelineStep !== "error" && (
            <div className="border border-border/20 rounded-2xl p-8 text-center space-y-3 bg-muted/5 min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center">
                <Film className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">O roteiro aparecerá aqui</p>
              <p className="text-[10px] text-muted-foreground/50">Suba uma imagem e clique em "Criar Vídeo com IA"</p>
            </div>
          )}

          {/* Loading state */}
          {isProcessing && !result && (
            <div className="border border-border/20 rounded-2xl p-8 text-center space-y-4 bg-muted/5 min-h-[400px] flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium">{stepLabels[pipelineStep].label}</p>
              <p className="text-[10px] text-muted-foreground">Isso pode levar alguns segundos...</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Image Analysis Card */}
              <div className="border border-border/20 rounded-xl p-3 bg-muted/5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <h3 className="text-xs font-semibold">Análise da Imagem</h3>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    { label: "Produto", value: result.analise_imagem?.produto_detectado },
                    { label: "Nicho", value: result.analise_imagem?.nicho_detectado },
                    { label: "Estilo", value: result.analise_imagem?.estilo_sugerido },
                    { label: "Rosto", value: result.analise_imagem?.tem_rosto ? "Sim" : "Não" },
                  ].map((item, i) => (
                    <div key={i} className="bg-background/50 rounded-lg p-1.5">
                      <p className="text-muted-foreground text-[9px]">{item.label}</p>
                      <p className="font-medium truncate">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Script Structure */}
              <div className="border border-border/20 rounded-xl p-3 bg-muted/5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-primary" />
                  <h3 className="text-xs font-semibold">{result.roteiro?.titulo || "Roteiro"}</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { emoji: "🎯", label: "Gancho", text: result.roteiro?.gancho },
                    { emoji: "😰", label: "Dor", text: result.roteiro?.dor },
                    { emoji: "💡", label: "Promessa", text: result.roteiro?.promessa },
                    { emoji: "✅", label: "Prova", text: result.roteiro?.prova },
                    { emoji: "🚀", label: "Solução", text: result.roteiro?.solucao },
                    { emoji: "🔥", label: "CTA", text: result.roteiro?.cta },
                  ].map((item, i) => (
                    <div key={i} className="bg-background/50 rounded-lg p-2">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.emoji} {item.label}</p>
                      <p className="text-[11px] mt-0.5">{item.text || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scenes Timeline */}
              <div className="border border-border/20 rounded-xl p-3 bg-muted/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-xs font-semibold">Cenas ({result.cenas?.length || 0})</h3>
                  </div>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {result.config_video?.duracao_total || duracao}
                  </span>
                </div>

                {/* Timeline bar */}
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
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

                {/* Scene cards with generated images */}
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {result.cenas?.map((cena, i) => (
                    <div key={i} className="border border-border/15 rounded-lg p-2 space-y-1.5 bg-background/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {generatedImages[i] ? (
                            <img src={generatedImages[i]} alt={`Cena ${cena.numero}`} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                              {cena.numero}
                            </div>
                          )}
                          <Badge variant="outline" className={`text-[8px] py-0 ${etapaColors[cena.etapa] || ""}`}>
                            {cena.etapa}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">{cena.duracao}</span>
                          <span className="text-[10px]" title={cena.movimento_camera}>{movimentoIcons[cena.movimento_camera] || "🎬"}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setExpandedScene(expandedScene === i ? null : i)}>
                          {expandedScene === i ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        </Button>
                      </div>

                      <p className="text-[11px] font-medium">{cena.texto_tela}</p>

                      {expandedScene === i && (
                        <div className="space-y-1 pt-1 border-t border-border/15">
                          {generatedImages[i] && (
                            <img src={generatedImages[i]} alt={`Cena ${cena.numero}`} className="w-full rounded-lg object-cover max-h-32" />
                          )}
                          <div>
                            <p className="text-[8px] text-muted-foreground uppercase">Narração</p>
                            <p className="text-[10px]">{cena.narracao}</p>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-[8px] py-0">📹 {cena.movimento_camera}</Badge>
                            <Badge variant="outline" className="text-[8px] py-0">✨ {cena.efeito_visual}</Badge>
                            <Badge variant="outline" className="text-[8px] py-0">💫 {cena.emocao}</Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy & Hashtags */}
              {result.copy && (
                <div className="border border-border/20 rounded-xl p-3 bg-muted/5 space-y-2">
                  <h3 className="text-xs font-semibold">📣 Copy</h3>
                  <p className="text-[11px] font-semibold">{result.copy.headline}</p>
                  <p className="text-[10px] text-muted-foreground">{result.copy.subheadline}</p>
                  <ul className="space-y-0.5">
                    {result.copy.bullet_points?.map((bp, i) => (
                      <li key={i} className="text-[10px] flex items-start gap-1">
                        <span className="text-primary">•</span> {bp}
                      </li>
                    ))}
                  </ul>
                  {result.copy.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.copy.hashtags.map(tag => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audio preview */}
              {audioUrl && (
                <div className="border border-border/20 rounded-xl p-3 bg-muted/5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-xs font-semibold">Narração</h3>
                  </div>
                  <audio src={audioUrl} controls className="w-full h-8" />
                </div>
              )}

              {/* Generate Video Button */}
              {pipelineStep === "script_ready" && (
                <Button
                  size="lg"
                  className="w-full rounded-xl h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80"
                  onClick={startRender}
                >
                  <Play className="w-4 h-4" /> Gerar Vídeo Final
                </Button>
              )}

              {/* Rendering state */}
              {(pipelineStep === "generating_images" || pipelineStep === "generating_audio" || pipelineStep === "rendering") && (
                <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  <p className="text-sm font-medium">{stepLabels[pipelineStep].label}</p>
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex justify-center gap-4 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><ImageIcon className="w-2.5 h-2.5" /> {generatedImages.length} imagens</span>
                    <span className="flex items-center gap-1"><Volume2 className="w-2.5 h-2.5" /> {audioUrl ? "✓" : "..."}</span>
                    <span className="flex items-center gap-1"><Subtitles className="w-2.5 h-2.5" /> legendas</span>
                  </div>
                </div>
              )}

              {/* Video Result */}
              {videoUrl && pipelineStep === "done" && (
                <div className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-emerald-400">🎬 Vídeo Pronto!</h3>
                  </div>
                  <video src={videoUrl} controls className="w-full rounded-lg" />
                  <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="w-4 h-4" /> Baixar MP4
                    </Button>
                  </a>
                </div>
              )}

              {/* Fallback: image grid when no video */}
              {!videoUrl && pipelineStep === "done" && generatedImages.length > 0 && (
                <div className="border border-amber-500/30 rounded-xl p-3 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-medium text-amber-400">Preview das cenas geradas</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {generatedImages.map((img, i) => (
                      <img key={i} src={img} alt={`Cena ${i + 1}`} className="rounded-lg object-cover aspect-[9/16] w-full" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageToVideoGenerator;
