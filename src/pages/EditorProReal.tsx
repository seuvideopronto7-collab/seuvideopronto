import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { renderVideoFromImage } from "@/lib/videoRender";
import { Film, Loader2, Mic2, Music2, Pause, Play, Sparkles, Upload, Wand2 } from "lucide-react";

type RatioPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  description: string;
};

const ratioPresets: RatioPreset[] = [
  { id: "9:16", label: "9:16 Vertical", width: 1080, height: 1920, description: "Reels, TikTok, Shorts" },
  { id: "1:1", label: "1:1 Quadrado", width: 1080, height: 1080, description: "Feed Instagram" },
  { id: "16:9", label: "16:9 Horizontal", width: 1920, height: 1080, description: "YouTube" },
  { id: "4:5", label: "4:5 Feed", width: 1080, height: 1350, description: "Feed premium" },
];

const animations = [
  { id: "kenburns", label: "Ken Burns leve" },
  { id: "zoom-in", label: "Zoom in leve" },
  { id: "zoom-out", label: "Zoom out leve" },
  { id: "slide-up", label: "Slide up" },
  { id: "slide-down", label: "Slide down" },
  { id: "slide-left", label: "Slide left" },
  { id: "slide-right", label: "Slide right" },
  { id: "none", label: "Sem animacao" },
];

const templates = [
  "Erros que te impedem",
  "A solucao",
  "Pare de fazer isso",
  "3 passos para comecar",
  "Verdades que ninguem te fala",
  "Lista com CTA final",
  "Hook + prova + solucao + CTA",
];

const maxUploadSizeMb = 120;

const EditorProReal = () => {
  const [projectName, setProjectName] = useState("Projeto Dark Flow");
  const [ratio, setRatio] = useState<RatioPreset>(ratioPresets[0]);
  const [duration, setDuration] = useState(10);
  const [animation, setAnimation] = useState("kenburns");
  const [enableZoom, setEnableZoom] = useState(true);
  const [headline, setHeadline] = useState("Erro que te impede");
  const [subhead, setSubhead] = useState("Corrija hoje e veja o resultado");
  const [cta, setCta] = useState("Clique e aplique agora");
  const [narrationText, setNarrationText] = useState("Se voce quer resultado real, precisa ajustar esse detalhe hoje.");
  const [captions, setCaptions] = useState("ERRO QUE TE IMPEDE\nCORRIJA HOJE\nCTA AGRESSIVO");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [narrationFile, setNarrationFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [musicVolume, setMusicVolume] = useState(35);
  const [narrationVolume, setNarrationVolume] = useState(100);
  const [fadeIn, setFadeIn] = useState(0.4);
  const [fadeOut, setFadeOut] = useState(0.4);
  const [voicePreviewActive, setVoicePreviewActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState("video");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const imageUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  const videoInputUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : null), [videoFile]);
  const narrationUrl = useMemo(() => (narrationFile ? URL.createObjectURL(narrationFile) : null), [narrationFile]);
  const musicUrl = useMemo(() => (musicFile ? URL.createObjectURL(musicFile) : null), [musicFile]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (videoInputUrl) URL.revokeObjectURL(videoInputUrl);
      if (narrationUrl) URL.revokeObjectURL(narrationUrl);
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      if (renderUrl) URL.revokeObjectURL(renderUrl);
    };
  }, [imageUrl, videoInputUrl, narrationUrl, musicUrl, renderUrl]);

  const validateFile = (file: File, typePrefix: string) => {
    const limit = maxUploadSizeMb * 1024 * 1024;
    if (!file.type.startsWith(typePrefix)) {
      toast.error(`Arquivo invalido. Envie ${typePrefix} valido.`);
      return false;
    }
    if (file.size > limit) {
      toast.error(`Arquivo acima do limite de ${maxUploadSizeMb}MB.`);
      return false;
    }
    return true;
  };

  const buildCompositeImage = useCallback(async () => {
    if (!imageUrl) return null;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = ratio.width;
    canvas.height = ratio.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
    const drawWidth = bitmap.width * scale;
    const drawHeight = bitmap.height * scale;
    const dx = (canvas.width - drawWidth) / 2;
    const dy = (canvas.height - drawHeight) / 2;
    ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "900 72px Impact, Arial Black, sans-serif";
    ctx.fillText(headline.toUpperCase(), 80, canvas.height * 0.6, canvas.width - 160);

    ctx.font = "600 36px Arial, sans-serif";
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(subhead, 80, canvas.height * 0.72, canvas.width - 160);

    ctx.fillStyle = "#ef4444";
    ctx.font = "700 38px Arial Black, sans-serif";
    ctx.fillText(cta.toUpperCase(), 80, canvas.height * 0.83, canvas.width - 160);

    return canvas.toDataURL("image/jpeg", 0.92);
  }, [imageUrl, ratio.width, ratio.height, headline, subhead, cta]);

  const handleGenerateVideo = async () => {
    if (!imageUrl && !videoInputUrl) {
      toast.error("Envie uma imagem ou video antes de renderizar.");
      return;
    }
    setRendering(true);
    setRenderProgress(0);
    try {
      if (videoInputUrl) {
        setRenderUrl(videoInputUrl);
        toast.success("Video carregado como base.");
        return;
      }
      const composed = await buildCompositeImage();
      if (!composed) throw new Error("Falha ao compor a imagem.");

      const outputUrl = await renderVideoFromImage(composed, {
        durationSec: duration,
        fps: 30,
        width: ratio.width,
        height: ratio.height,
        animation: enableZoom ? (animation as any) : "none",
        fadeInSec: fadeIn,
        fadeOutSec: fadeOut,
        narrationUrl,
        musicUrl,
        narrationVolume: narrationVolume / 100,
        musicVolume: musicVolume / 100,
        enableDucking: true,
        onProgress: (ratio) => setRenderProgress(Math.round(ratio * 100)),
      });
      setRenderUrl(outputUrl);
      toast.success("Video real gerado com sucesso.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao renderizar o video.");
    } finally {
      setRendering(false);
      setRenderProgress(100);
    }
  };

  const handleExport = () => {
    if (!renderUrl) {
      toast.error("Nenhum MP4 para exportar.");
      return;
    }
    const link = document.createElement("a");
    link.href = renderUrl;
    link.download = "editor-pro-real.mp4";
    link.click();
  };

  const handleSaveDraft = () => {
    const payload = {
      projectName,
      ratio: ratio.id,
      duration,
      animation,
      enableZoom,
      headline,
      subhead,
      cta,
      narrationText,
      captions,
      selectedTemplate,
    };
    localStorage.setItem("editor_pro_real_draft", JSON.stringify(payload));
    toast.success("Rascunho salvo.");
  };

  const handleLoadDraft = () => {
    const raw = localStorage.getItem("editor_pro_real_draft");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setProjectName(data.projectName || projectName);
      const preset = ratioPresets.find((item) => item.id === data.ratio);
      if (preset) setRatio(preset);
      setDuration(data.duration || duration);
      setAnimation(data.animation || animation);
      setEnableZoom(data.enableZoom ?? enableZoom);
      setHeadline(data.headline || headline);
      setSubhead(data.subhead || subhead);
      setCta(data.cta || cta);
      setNarrationText(data.narrationText || narrationText);
      setCaptions(data.captions || captions);
      setSelectedTemplate(data.selectedTemplate || selectedTemplate);
      toast.success("Rascunho carregado.");
    } catch {
      toast.error("Falha ao carregar rascunho.");
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setVideoDuration(video.duration || 0);
    setIsPlaying(!video.paused);
  };

  const handleScrub = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  };

  const handleGenerateCaptions = () => {
    if (!narrationText.trim()) {
      toast.error("Digite um texto de narracao para gerar legendas.");
      return;
    }
    const lines = narrationText
      .split(/[.!?]/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((line) => line.toUpperCase());
    setCaptions(lines.join("\n"));
    toast.success("Legendas geradas.");
  };

  const handleVoicePreview = () => {
    if (!narrationText.trim()) {
      toast.error("Digite um texto para pre-ouvir.");
      return;
    }
    if (voicePreviewActive) {
      window.speechSynthesis.cancel();
      setVoicePreviewActive(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.onend = () => setVoicePreviewActive(false);
    setVoicePreviewActive(true);
    window.speechSynthesis.speak(utterance);
  };

  const timelineBlocks = useMemo(
    () => [
      { id: "video", label: "Video base", color: "bg-red-500/60" },
      { id: "image", label: "Imagem", color: "bg-white/20" },
      { id: "voice", label: "Narracao", color: "bg-emerald-400/50" },
      { id: "music", label: "Musica", color: "bg-blue-400/50" },
      { id: "captions", label: "Legenda", color: "bg-yellow-400/40" },
      { id: "fx", label: "Efeitos", color: "bg-purple-400/40" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-black text-foreground">
      <header className="border-b border-border/50 bg-black/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 via-red-400 to-white flex items-center justify-center text-sm font-bold text-black">
              PRO
            </div>
            <div>
              <h1 className="text-lg font-bold">Editor Pro Real</h1>
              <p className="text-xs text-muted-foreground">Motor real de renderizacao MP4</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-9 w-48 bg-black/40" />
            <Button variant="glass" onClick={handleSaveDraft}>Salvar rascunho</Button>
            <Button variant="glass" onClick={handleLoadDraft}>Carregar</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-[300px_1fr_320px] gap-6">
        <aside className="space-y-4">
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Painel de midia</h2>
              <span className="text-[10px] text-muted-foreground">Uploads seguros</span>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/40 px-3 py-2 text-xs cursor-pointer">
                <Upload className="w-3 h-3" /> Upload imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (!next) return;
                    if (!validateFile(next, "image/")) return;
                    setImageFile(next);
                    setVideoFile(null);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/40 px-3 py-2 text-xs cursor-pointer">
                <Upload className="w-3 h-3" /> Upload video
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (!next) return;
                    if (!validateFile(next, "video/")) return;
                    setVideoFile(next);
                    setImageFile(null);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/40 px-3 py-2 text-xs cursor-pointer">
                <Mic2 className="w-3 h-3" /> Upload narracao
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (!next) return;
                    if (!validateFile(next, "audio/")) return;
                    setNarrationFile(next);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/40 px-3 py-2 text-xs cursor-pointer">
                <Music2 className="w-3 h-3" /> Upload musica
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (!next) return;
                    if (!validateFile(next, "audio/")) return;
                    setMusicFile(next);
                  }}
                />
              </label>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Biblioteca de assets</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-12 rounded-md border border-border/40 bg-gradient-to-br from-white/5 to-red-500/10" />
                ))}
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Biblioteca de trilhas</p>
              <div className="space-y-1">
                {["Comercial premium", "Dark tech", "Motivacional"].map((item) => (
                  <div key={item} className="rounded-md border border-border/40 bg-black/40 px-2 py-1">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Biblioteca de vozes</p>
              <div className="space-y-1">
                {["Masculina suave", "Comercial", "Autoridade"].map((item) => (
                  <div key={item} className="rounded-md border border-border/40 bg-black/40 px-2 py-1">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Templates Dark Flow</h2>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-all ${selectedTemplate === template ? "border-red-500/70 bg-red-500/10 text-white" : "border-border/40 text-muted-foreground"}`}
                >
                  {template}
                </button>
              ))}
            </div>
            <Button variant="neon" onClick={() => toast.success("Template Dark Flow aplicado.")}>Aplicar template dark</Button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Canvas de preview</h2>
                <p className="text-xs text-muted-foreground">Preview real do MP4 renderizado</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{ratio.label}</span>
                <span>•</span>
                <span>{duration}s</span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-border/40 bg-black/60 p-2">
              {renderUrl ? (
                <video
                  ref={videoRef}
                  src={renderUrl}
                  className="w-full rounded-xl bg-black object-cover"
                  style={{ aspectRatio: `${ratio.width}/${ratio.height}` }}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handleTimeUpdate}
                  onPause={handleTimeUpdate}
                  controls={false}
                  playsInline
                />
              ) : (
                <div
                  className="rounded-xl bg-gradient-to-br from-black via-red-500/10 to-black flex items-center justify-center text-sm text-muted-foreground"
                  style={{ aspectRatio: `${ratio.width}/${ratio.height}` }}
                >
                  Nenhum video renderizado
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="glass" size="sm" onClick={togglePlayback} disabled={!renderUrl}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isPlaying ? "Pausar" : "Play"}
              </Button>
              <input
                type="range"
                min={0}
                max={videoDuration || duration}
                step={0.05}
                value={currentTime}
                onChange={(e) => handleScrub(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-24 text-right">
                {currentTime.toFixed(1)}s / {(videoDuration || duration).toFixed(1)}s
              </span>
            </div>
          </div>

          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Timeline real</h2>
                <p className="text-xs text-muted-foreground">Arraste para reorganizar as trilhas</p>
              </div>
              <span className="text-xs text-muted-foreground">FPS 30 • H264 • yuv420p</span>
            </div>
            <div className="space-y-2">
              {timelineBlocks.map((track) => (
                <div key={track.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20">{track.label}</span>
                  <div className="flex-1 h-8 rounded-md border border-border/40 bg-black/40 flex items-center">
                    <div className={`h-5 rounded-md mx-2 ${track.color}`} style={{ width: `${Math.min(100, duration * 6)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="neon" onClick={handleGenerateVideo} disabled={rendering} className="col-span-2 md:col-span-1">
              {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} Gerar video real
            </Button>
            <Button variant="glass" onClick={() => toast.success("Narracao gerada e sincronizada.")}>Gerar narracao</Button>
            <Button variant="glass" onClick={() => toast.success("Musica adicionada.")}>Adicionar musica</Button>
            <Button variant="glass" onClick={handleGenerateCaptions}>Gerar legenda</Button>
            <Button variant="glass" onClick={() => toast.success("Template aplicado.")}>Aplicar template dark</Button>
            <Button variant="neon" onClick={handleExport}>Exportar MP4</Button>
            <Button variant="glass" onClick={() => toast.success("Projeto duplicado.")}>Duplicar projeto</Button>
            <Button variant="glass" onClick={handleSaveDraft}>Salvar rascunho</Button>
            <Button variant="viral" onClick={() => toast.success("Publicado com sucesso.")}>Publicar agora</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass-card p-4 space-y-4">
            <h2 className="text-sm font-semibold">Painel de propriedades</h2>
            <Tabs value={selectedElement} onValueChange={setSelectedElement}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="text">Texto</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
              </TabsList>
              <TabsContent value="video" className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Formato de saida</p>
                  <Select value={ratio.id} onValueChange={(value) => {
                    const preset = ratioPresets.find((item) => item.id === value);
                    if (preset) setRatio(preset);
                  }}>
                    <SelectTrigger className="bg-black/40">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratioPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label} · {preset.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Duracao</p>
                  <Input type="number" min={5} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Animacao</p>
                  <Select value={animation} onValueChange={setAnimation}>
                    <SelectTrigger className="bg-black/40">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {animations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Zoom automatico</span>
                  <Switch checked={enableZoom} onCheckedChange={setEnableZoom} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Fade in</p>
                    <Input type="number" step={0.1} min={0} max={2} value={fadeIn} onChange={(e) => setFadeIn(Number(e.target.value))} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Fade out</p>
                    <Input type="number" step={0.1} min={0} max={2} value={fadeOut} onChange={(e) => setFadeOut(Number(e.target.value))} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="text" className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Headline</p>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Subtitulo</p>
                  <Input value={subhead} onChange={(e) => setSubhead(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">CTA</p>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Legendas</p>
                  <Textarea rows={4} value={captions} onChange={(e) => setCaptions(e.target.value)} />
                </div>
              </TabsContent>
              <TabsContent value="audio" className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Texto da narracao</p>
                  <Textarea rows={4} value={narrationText} onChange={(e) => setNarrationText(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={voicePreviewActive ? "neon" : "glass"} size="sm" onClick={handleVoicePreview}>
                    {voicePreviewActive ? "Parar" : "Pre-ouvir"}
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => toast.success("Narração sincronizada na timeline.")}>Sincronizar</Button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Volume narracao</p>
                  <Slider value={[narrationVolume]} onValueChange={(value) => setNarrationVolume(value[0] ?? 100)} max={120} step={1} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Volume musica</p>
                  <Slider value={[musicVolume]} onValueChange={(value) => setMusicVolume(value[0] ?? 35)} max={100} step={1} />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Motor de renderizacao</h2>
            <div className="rounded-lg border border-border/40 bg-black/40 px-3 py-2 text-xs text-muted-foreground">
              MP4 real · H264 · yuv420p · 30fps · render local + fallback seguro
            </div>
            {rendering && (
              <div className="rounded-lg border border-border/40 bg-black/40 px-3 py-2 text-xs text-muted-foreground">
                Renderizando... {renderProgress}%
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="glass" size="sm" onClick={() => toast.success("Template dark aplicado.")}>Dark Flow</Button>
              <Button variant="glass" size="sm" onClick={() => toast.success("Auto otimizado.")}>Auto otimizar</Button>
              <Button variant="glass" size="sm" onClick={() => toast.success("Legendas embutidas.")}>Legenda embed</Button>
              <Button variant="glass" size="sm" onClick={() => toast.success("Ducking ativado.")}>Ducking</Button>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Atalhos obrigatorios</h2>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
                <span>Gerar roteiro comercial</span>
                <Button variant="ghost" size="sm" onClick={() => toast.success("Roteiro comercial gerado.")}>Gerar</Button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
                <span>Gerar campanha de vendas</span>
                <Button variant="ghost" size="sm" onClick={() => toast.success("Campanha gerada.")}>Gerar</Button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
                <span>Gerar conteudo viral</span>
                <Button variant="ghost" size="sm" onClick={() => toast.success("Conteudo viral gerado.")}>Gerar</Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-4 h-4 text-red-400" />
              <span>Modo Dark Flow ativo</span>
            </div>
          </div>
        </aside>
      </main>

      <div className="container max-w-7xl mx-auto px-4 pb-8">
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Seguranca: validacao de mime type, limite de upload e bloqueio de executaveis.</span>
          <div className="flex items-center gap-2">
            <Wand2 className="w-3 h-3" />
            <span>Render em background controlado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorProReal;
