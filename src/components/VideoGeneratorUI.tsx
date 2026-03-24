import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, Wand2, Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createVideoJob, fetchVideoJob, processVideoJob } from "@/services/api";
import { buscarAPI } from "@/lib/apiRegistry";

const productTypes = ["Natural", "Suplemento", "Cosmetico", "Tecnologia", "Outro"];
const styleTypes = ["Luxo", "Fitness", "Saude", "Tecnologia"];

const finalStatuses = new Set(["completed", "failed", "fallback"]);

const VideoGeneratorUI = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [productType, setProductType] = useState(productTypes[0]);
  const [styleType, setStyleType] = useState(styleTypes[0]);
  const [useDarkflow, setUseDarkflow] = useState(false);
  const [useViral, setUseViral] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolution, setResolution] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [apiChecks, setApiChecks] = useState<Array<{ name: string; status: "ok" | "error"; message?: string }>>([]);
  const [isCheckingApis, setIsCheckingApis] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

    const poll = async () => {
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

    poll();
    const interval = window.setInterval(poll, 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(watchdog);
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

      const payload = {
        imageUrl: resolvedImageUrl,
        productType,
        style: styleType,
        useDarkflow,
        useViral,
      };
      const { id } = await createVideoJob(payload);
      setJobId(id);
      toast.success("Job criado. Processando...");
      await processVideoJob({ jobId: id, ...payload });
    } catch (error: any) {
      console.error("PDG DEBUG: erro detectado e tratado", error);
      toast.error(error?.message || "Falha ao iniciar o job.");
      setJobStatus("failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const gerarVideoReal = () => {
    console.log("Gerar vídeo agora");
    try {
      void startJob();
    } catch (e) {
      console.error("Erro gerar video:", e);
    }
  };

  const progressLabel = useMemo(() => {
    if (!jobStatus) return "Aguardando";
    if (jobStatus === "completed") return "Concluído";
    if (jobStatus === "failed") return "Erro";
    if (jobStatus === "fallback") return "Fallback";
    return jobStatus.replace(/_/g, " ");
  }, [jobStatus]);

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
              <h2 className="text-lg font-semibold">Tipo do produto</h2>
              <p className="text-xs text-muted-foreground">Ajusta a estética do prompt</p>
            </div>
            <Badge variant="secondary">Etapa 2</Badge>
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
            <Badge variant="secondary">Etapa 3</Badge>
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
            <Badge variant="secondary">Etapa 4</Badge>
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
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Iniciar pipeline</h2>
              <p className="text-xs text-muted-foreground">Cria o job e executa o processamento</p>
            </div>
            <Badge variant="secondary">Etapa 5</Badge>
          </div>
          <Button variant="neon" onClick={startJob} disabled={isProcessing}>
            <Wand2 className="h-4 w-4" /> {isProcessing ? "Processando..." : "Gerar vídeo"}
          </Button>
          <Button variant="glass" onClick={gerarVideoReal} disabled={isProcessing}>
            Gerar vídeo agora
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Status do job</h2>
              <p className="text-xs text-muted-foreground">Monitoramento em tempo real</p>
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{jobId ? `Job ${jobId}` : "Nenhum job ativo"}</span>
            <Badge variant="secondary">{progressLabel}</Badge>
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Preview</h2>
              <p className="text-xs text-muted-foreground">Vídeo final com player elegante</p>
            </div>
            <Badge variant="secondary">{videoUrl ? "Pronto" : "Aguardando"}</Badge>
          </div>
          <div className="rounded-2xl border border-border/50 bg-black/60 p-2">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full rounded-xl" poster={previewUrl || undefined} />
            ) : (
              <div className="rounded-xl h-52 flex items-center justify-center text-xs text-muted-foreground">
                Nenhum vídeo renderizado
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
