import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Upload, Wand2, Play, Film, Eye, Clock, ChevronDown, ChevronUp,
  Sparkles, Download, Loader2, ImageIcon, Volume2, Type, Zap, Target, Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import HomeHeader from "@/components/home/HomeHeader";

type Objetivo = "vendas" | "autoridade" | "engajamento";
type Formato = "tiktok" | "shorts" | "instagram_feed" | "stories";
type Duracao = "5s" | "60s" | "2min" | "4min";

type Cena = {
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

type AnaliseImagem = {
  produto_detectado: string;
  nicho_detectado: string;
  cores_dominantes?: string[];
  contexto: string;
  tem_rosto?: boolean;
  estilo_sugerido: string;
};

type Roteiro = {
  titulo: string;
  gancho: string;
  dor: string;
  promessa: string;
  prova: string;
  solucao: string;
  cta: string;
  narracao_completa: string;
};

type Copy = {
  headline: string;
  subheadline: string;
  bullet_points: string[];
  hashtags: string[];
};

type ConfigVideo = {
  aspect_ratio: string;
  resolucao: string;
  duracao_total: string;
  estilo_edicao: string;
  voz_sugerida: string;
};

type GenerationResult = {
  analise_imagem: AnaliseImagem;
  roteiro: Roteiro;
  cenas: Cena[];
  copy: Copy;
  config_video: ConfigVideo;
  jobId: string | null;
};

const objetivoConfig: Record<Objetivo, { label: string; icon: typeof Target; color: string; desc: string }> = {
  vendas: { label: "Vendas", icon: Target, color: "bg-red-500/20 text-red-400 border-red-500/30", desc: "CTA agressivo, conversão máxima" },
  autoridade: { label: "Autoridade", icon: Sparkles, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", desc: "Branding pessoal, expert" },
  engajamento: { label: "Engajamento", icon: Zap, color: "bg-amber-500/20 text-amber-400 border-amber-500/30", desc: "Viral, compartilhável" },
};

const formatoConfig: Record<Formato, { label: string; ratio: string }> = {
  tiktok: { label: "TikTok", ratio: "9:16" },
  shorts: { label: "Shorts", ratio: "9:16" },
  instagram_feed: { label: "Instagram Feed", ratio: "1:1" },
  stories: { label: "Stories", ratio: "9:16" },
};

const duracaoOptions: { value: Duracao; label: string }[] = [
  { value: "5s", label: "5 segundos" },
  { value: "60s", label: "1 minuto" },
  { value: "2min", label: "2 minutos" },
  { value: "4min", label: "4 minutos" },
];

const etapaColors: Record<string, string> = {
  gancho: "bg-red-500/20 text-red-400",
  dor: "bg-orange-500/20 text-orange-400",
  promessa: "bg-blue-500/20 text-blue-400",
  prova: "bg-emerald-500/20 text-emerald-400",
  solucao: "bg-purple-500/20 text-purple-400",
  cta: "bg-amber-500/20 text-amber-400",
};

const movimentoIcons: Record<string, string> = {
  zoom_in: "🔍",
  zoom_out: "🔎",
  pan: "↔️",
  crop_inteligente: "✂️",
  reveal: "✨",
  before_after: "🔄",
  static: "📌",
};

const ImageToVideo = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo>("vendas");
  const [formato, setFormato] = useState<Formato>("tiktok");
  const [duracao, setDuracao] = useState<Duracao>("60s");
  const [produtoNome, setProdutoNome] = useState("");
  const [nicho, setNicho] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(f.name)) {
      toast.error("Envie JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 20MB).");
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
    setVideoUrl(null);
  }, [previewUrl]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  const uploadImage = async (): Promise<string> => {
    if (!file) throw new Error("Nenhuma imagem selecionada");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `commercial/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media-uploads").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const analyzeAndGenerate = async () => {
    if (!file) {
      toast.error("Envie uma imagem primeiro.");
      return;
    }
    setIsAnalyzing(true);
    setAnalyzeProgress(10);
    setResult(null);

    try {
      setAnalyzeProgress(20);
      const imageUrl = await uploadImage();
      setAnalyzeProgress(40);

      const { data, error } = await supabase.functions.invoke("generate-commercial-video", {
        body: { imageUrl, objetivo, formato, duracao, produtoNome: produtoNome || undefined, nicho: nicho || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAnalyzeProgress(90);
      setResult(data as GenerationResult);
      setAnalyzeProgress(100);
      toast.success("Roteiro comercial gerado com sucesso!");
    } catch (err: any) {
      console.error("Erro na análise:", err);
      toast.error(err?.message || "Erro ao analisar imagem.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFinalVideo = async () => {
    if (!result?.jobId) {
      toast.error("Gere o roteiro primeiro.");
      return;
    }
    setIsGeneratingVideo(true);
    setVideoProgress(10);

    try {
      const { data, error } = await supabase.functions.invoke("video-pipeline", {
        body: {
          jobId: result.jobId,
          imageUrl: previewUrl,
          script: result.roteiro.narracao_completa,
          scenes: result.cenas.map(c => ({
            texto: c.texto_tela,
            visual: c.movimento_camera,
            emocao: c.emocao,
            prompt_imagem: c.prompt_imagem,
          })),
        },
      });

      if (error) throw error;
      setVideoProgress(100);
      setVideoUrl(data?.videoUrl || null);
      if (data?.videoUrl) toast.success("🎬 Vídeo comercial gerado!");
      else toast.warning("Pipeline iniciado. Acompanhe o progresso.");
    } catch (err: any) {
      console.error("Erro no vídeo:", err);
      toast.error(err?.message || "Erro ao gerar vídeo.");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <HomeHeader />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Camera className="w-3.5 h-3.5" />
            Imagem → Vídeo Comercial
          </div>
          <h1 className="text-3xl font-bold">Crie vídeos comerciais com IA</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Suba uma imagem e gere automaticamente um vídeo profissional para vendas, autoridade ou engajamento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT: Upload + Config */}
          <div className="space-y-5">
            {/* Upload */}
            <div
              className="relative border-2 border-dashed border-border/50 rounded-2xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer group"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] || null)}
              />
              {previewUrl ? (
                <div className="space-y-3">
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
                  <p className="text-xs text-muted-foreground">Clique para trocar a imagem</p>
                </div>
              ) : (
                <div className="space-y-3 py-6">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Arraste ou clique para enviar</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP • Máx 20MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Produto & Nicho */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Produto (opcional)</label>
                <input
                  type="text"
                  value={produtoNome}
                  onChange={e => setProdutoNome(e.target.value)}
                  placeholder="Ex: Sérum facial"
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nicho (opcional)</label>
                <input
                  type="text"
                  value={nicho}
                  onChange={e => setNicho(e.target.value)}
                  placeholder="Ex: Skincare"
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Objetivo do vídeo</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(objetivoConfig) as [Objetivo, typeof objetivoConfig.vendas][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setObjetivo(key)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] ${
                        objetivo === key
                          ? "border-primary/50 bg-primary/10 shadow-sm"
                          : "border-border/30 bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${objetivo === key ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formato */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Formato</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(formatoConfig) as [Formato, typeof formatoConfig.tiktok][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFormato(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      formato === key
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/30 bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cfg.label} <span className="opacity-60">({cfg.ratio})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duração */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Duração</label>
              <div className="flex gap-2 flex-wrap">
                {duracaoOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDuracao(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                      duracao === opt.value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/30 bg-muted/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              size="lg"
              className="w-full rounded-xl h-12 text-sm font-semibold"
              onClick={analyzeAndGenerate}
              disabled={!file || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando imagem...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Criar Vídeo com IA
                </>
              )}
            </Button>

            {isAnalyzing && (
              <div className="space-y-1.5">
                <Progress value={analyzeProgress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-center">
                  {analyzeProgress < 30 ? "Enviando imagem..." : analyzeProgress < 70 ? "Analisando com IA..." : "Gerando roteiro..."}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Result Preview */}
          <div className="space-y-5">
            {!result && !isAnalyzing && (
              <div className="border border-border/20 rounded-2xl p-8 text-center space-y-3 bg-muted/10 min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Film className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">O preview do roteiro aparecerá aqui</p>
                <p className="text-xs text-muted-foreground/60">Suba uma imagem e clique em "Criar Vídeo com IA"</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Image Analysis */}
                <div className="border border-border/20 rounded-xl p-4 bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Análise da Imagem</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Produto</p>
                      <p className="font-medium">{result.analise_imagem?.produto_detectado || "—"}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Nicho</p>
                      <p className="font-medium">{result.analise_imagem?.nicho_detectado || "—"}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Estilo</p>
                      <p className="font-medium">{result.analise_imagem?.estilo_sugerido || "—"}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-2">
                      <p className="text-muted-foreground">Rosto</p>
                      <p className="font-medium">{result.analise_imagem?.tem_rosto ? "Sim" : "Não"}</p>
                    </div>
                  </div>
                </div>

                {/* Script Structure */}
                <div className="border border-border/20 rounded-xl p-4 bg-muted/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">{result.roteiro?.titulo || "Roteiro"}</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "🎯 Gancho", text: result.roteiro?.gancho },
                      { label: "😰 Dor", text: result.roteiro?.dor },
                      { label: "💡 Promessa", text: result.roteiro?.promessa },
                      { label: "✅ Prova", text: result.roteiro?.prova },
                      { label: "🚀 Solução", text: result.roteiro?.solucao },
                      { label: "🔥 CTA", text: result.roteiro?.cta },
                    ].map((item, i) => (
                      <div key={i} className="bg-background/50 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                        <p className="text-xs">{item.text || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scenes Timeline */}
                <div className="border border-border/20 rounded-xl p-4 bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">Cenas ({result.cenas?.length || 0})</h3>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.config_video?.duracao_total || duracao}
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {result.cenas?.map((cena, i) => (
                      <div
                        key={i}
                        className={`flex-1 transition-all hover:opacity-80 cursor-pointer ${
                          etapaColors[cena.etapa]?.split(" ")[0] || "bg-muted"
                        }`}
                        title={`Cena ${cena.numero}: ${cena.etapa}`}
                        onClick={() => setExpandedScene(expandedScene === i ? null : i)}
                      />
                    ))}
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {result.cenas?.map((cena, i) => (
                      <div key={i} className="border border-border/20 rounded-lg p-3 space-y-2 bg-background/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                              {cena.numero}
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${etapaColors[cena.etapa] || ""}`}>
                              {cena.etapa}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{cena.duracao}</span>
                            <span title={cena.movimento_camera}>{movimentoIcons[cena.movimento_camera] || "🎬"}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setExpandedScene(expandedScene === i ? null : i)}
                          >
                            {expandedScene === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        </div>

                        <p className="text-xs font-medium">{cena.texto_tela}</p>

                        {expandedScene === i && (
                          <div className="space-y-1.5 pt-1 border-t border-border/20">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Narração</p>
                              <p className="text-xs">{cena.narracao}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                📹 {cena.movimento_camera}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                ✨ {cena.efeito_visual}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                💫 {cena.emocao}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Prompt de imagem</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{cena.prompt_imagem}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy & Hashtags */}
                {result.copy && (
                  <div className="border border-border/20 rounded-xl p-4 bg-muted/10 space-y-3">
                    <h3 className="text-sm font-semibold">📣 Copy</h3>
                    <p className="text-xs font-semibold">{result.copy.headline}</p>
                    <p className="text-xs text-muted-foreground">{result.copy.subheadline}</p>
                    <ul className="space-y-1">
                      {result.copy.bullet_points?.map((bp, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span> {bp}
                        </li>
                      ))}
                    </ul>
                    {result.copy.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.copy.hashtags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Video Config */}
                {result.config_video && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="border border-border/20 rounded-lg p-2 bg-muted/10 text-center">
                      <p className="text-muted-foreground">Formato</p>
                      <p className="font-semibold">{result.config_video.aspect_ratio}</p>
                    </div>
                    <div className="border border-border/20 rounded-lg p-2 bg-muted/10 text-center">
                      <p className="text-muted-foreground">Edição</p>
                      <p className="font-semibold">{result.config_video.estilo_edicao}</p>
                    </div>
                    <div className="border border-border/20 rounded-lg p-2 bg-muted/10 text-center">
                      <p className="text-muted-foreground">Voz</p>
                      <p className="font-semibold flex items-center justify-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        {result.config_video.voz_sugerida}
                      </p>
                    </div>
                  </div>
                )}

                {/* Generate Video Button */}
                <Button
                  size="lg"
                  className="w-full rounded-xl h-12 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80"
                  onClick={generateFinalVideo}
                  disabled={isGeneratingVideo}
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando vídeo...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Gerar Vídeo Final
                    </>
                  )}
                </Button>

                {isGeneratingVideo && (
                  <div className="space-y-1.5">
                    <Progress value={videoProgress} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground text-center">Renderizando vídeo comercial...</p>
                  </div>
                )}

                {/* Video Result */}
                {videoUrl && (
                  <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">🎬 Vídeo Pronto!</h3>
                    </div>
                    <video src={videoUrl} controls className="w-full rounded-lg" />
                    <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="w-4 h-4" />
                        Baixar MP4
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImageToVideo;
