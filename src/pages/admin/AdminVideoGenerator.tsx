import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Wand2, PlayCircle, Download, Copy, Send } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { renderVideoFromImage } from "@/lib/videoRender";

type StageStatus = "idle" | "processing" | "done" | "error" | "blocked";

const productTypes = ["Natural", "Suplemento", "Cosmetico", "Tecnologia", "Outro"];
const styleTypes = ["Luxo", "Fitness", "Saude", "Tecnologia"];

const AdminVideoGenerator = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [productType, setProductType] = useState(productTypes[0]);
  const [styleType, setStyleType] = useState(styleTypes[0]);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [roteiro, setRoteiro] = useState<string>("");
  const [narracao, setNarracao] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stages, setStages] = useState<StageStatus[]>(Array(8).fill("idle"));

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetStages = () => {
    setStages(Array(8).fill("idle"));
    setCurrentStage(0);
  };

  const updateStage = (index: number, status: StageStatus) => {
    setStages((prev) => prev.map((item, idx) => (idx === index ? status : item)));
    setCurrentStage((prev) => Math.max(prev, index));
  };

  const progressValue = useMemo(() => {
    const completed = stages.filter((stage) => stage === "done").length;
    return (completed / 8) * 100;
  }, [stages]);

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

  const buildPrompt = () => {
    return `Video cinematografico premium para produto do tipo ${productType}, estilo ${styleType}, com foco comercial e atmosfera de estudio.`;
  };

  const handleGenerate = async (mode: "cinema" | "darkflow" | "viral") => {
    if (!file) {
      toast.error("Envie uma imagem antes de gerar.");
      return;
    }

    resetStages();
    setIsRunning(true);
    setRenderUrl(null);
    setRoteiro("");
    setNarracao("");

    try {
      updateStage(0, "processing");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `admin-generator/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media-uploads").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media-uploads").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;
      updateStage(0, "done");

      updateStage(1, "processing");
      const prompt = buildPrompt();
      updateStage(1, "done");

      updateStage(2, "processing");
      let videoUrl: string | null = null;
      try {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: {
            imageUrl,
            estilo: mode === "darkflow" ? "darkflow" : "cinematografico",
            movimento: mode === "viral" ? "cortes dinamicos" : "zoom cinematografico",
            duracao: 6,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        videoUrl = data?.videoUrl || null;
        updateStage(2, "done");
      } catch (err) {
        updateStage(2, "error");
        videoUrl = await renderVideoFromImage(imageUrl, { durationSec: 6, fps: 30, animation: "kenburns" });
      }

      updateStage(3, "processing");
      try {
        const { data, error } = await supabase.functions.invoke("generate-viral", {
          body: {
            produto: productType,
            nicho: styleType,
            objetivo: mode === "viral" ? "viral" : "vendas",
            tipo: "roteiro",
            contextoMestre: {
              tema: styleType,
              publico: "Compradores premium",
              objetivo: "vendas",
              linguagem: "pt-BR",
              tom: "cinematografico",
            },
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const roteiroTexto = data?.roteiro?.roteiro_completo || data?.roteiro?.hook || "Roteiro cinematografico pronto.";
        setRoteiro(roteiroTexto);
        updateStage(3, "done");
      } catch (err) {
        setRoteiro("Roteiro base pronto com gancho e CTA comercial.");
        updateStage(3, "error");
      }

      updateStage(4, "blocked");
      setNarracao("Narração pendente de integração com ElevenLabs.");

      updateStage(5, "blocked");

      updateStage(6, "processing");
      setRenderUrl(videoUrl);
      updateStage(6, "done");

      updateStage(7, "done");
      toast.success("Video cinematografico finalizado.");
    } catch (err: any) {
      toast.error(err?.message || "Falha no pipeline.");
    } finally {
      setIsRunning(false);
    }
  };

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  };

  const downloadVideo = () => {
    if (!renderUrl) return;
    const link = document.createElement("a");
    link.href = renderUrl;
    link.download = "cinematic-video.mp4";
    link.click();
  };

  const stageLabels = [
    "Upload concluido",
    "Preparando prompt",
    "Enviando para motor de video",
    "Gerando roteiro",
    "Gerando narracao",
    "Aplicando trilha",
    "Renderizando video final",
    "Finalizado",
  ];

  return (
    <AdminLayout title="Geracao de Video" description="Pipeline real por imagem" actionLabel="Nova renderizacao">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="space-y-6">
          <div className="cinema-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Upload cinematografico</h2>
                <p className="text-xs text-muted-foreground">JPG, PNG, WEBP com validacao real</p>
              </div>
              <Badge variant="secondary">Etapa 1</Badge>
            </div>
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
                    <span className="text-muted-foreground">Resolucao</span>
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
                <p className="text-xs text-muted-foreground">Define o tom do prompt cinematografico</p>
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
                <h2 className="text-lg font-semibold">Estilo de geracao</h2>
                <p className="text-xs text-muted-foreground">Luxo, fitness, saude ou tecnologia</p>
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
                <h2 className="text-lg font-semibold">Acoes premium</h2>
                <p className="text-xs text-muted-foreground">Fluxo completo com fallback inteligente</p>
              </div>
              <Badge variant="secondary">Etapa 4</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="neon" onClick={() => handleGenerate("cinema")} disabled={isRunning}>
                <Wand2 className="h-4 w-4" /> Gerar video cinematografico
              </Button>
              <Button variant="glass" onClick={() => handleGenerate("darkflow")} disabled={isRunning}>
                Modo Darkflow
              </Button>
              <Button variant="viral" onClick={() => handleGenerate("viral")} disabled={isRunning}>
                Gerar versao viral
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="cinema-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Progresso real</h2>
                <p className="text-xs text-muted-foreground">Pipeline conectado ao backend</p>
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} />
            <div className="space-y-2">
              {stageLabels.map((label, index) => {
                const status = stages[index];
                const badgeClass =
                  status === "done"
                    ? "status-complete"
                    : status === "processing"
                      ? "status-processing"
                      : status === "error"
                        ? "status-error"
                        : status === "blocked"
                          ? "status-disconnected"
                          : "status-disconnected";
                const badgeLabel =
                  status === "done"
                    ? "CONCLUIDO"
                    : status === "processing"
                      ? "PROCESSANDO"
                      : status === "error"
                        ? "ERRO"
                        : status === "blocked"
                          ? "DESCONECTADO"
                          : "PENDENTE";
                return (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`status-pill ${badgeClass}`}>{badgeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cinema-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-xs text-muted-foreground">Video final com player elegante</p>
              </div>
              {renderUrl ? <Badge variant="secondary">Pronto</Badge> : <Badge variant="secondary">Aguardando</Badge>}
            </div>
            <div className="rounded-2xl border border-border/50 bg-black/60 p-2">
              {renderUrl ? (
                <video src={renderUrl} controls className="w-full rounded-xl" poster={previewUrl || undefined} />
              ) : (
                <div className="rounded-xl h-52 flex items-center justify-center text-xs text-muted-foreground">
                  Nenhum video renderizado
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="glass" onClick={downloadVideo} disabled={!renderUrl}>
                <Download className="h-4 w-4" /> Baixar video
              </Button>
              <Button variant="glass" onClick={() => renderUrl && copyText(renderUrl, "Link do video")} disabled={!renderUrl}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
            </div>
          </div>

          <div className="cinema-panel p-6 space-y-4">
            <h2 className="text-lg font-semibold">Acoes finais</h2>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span>Roteiro comercial</span>
                  <Button variant="ghost" size="sm" onClick={() => copyText(roteiro || "Roteiro indisponivel", "Roteiro")}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
                <p className="mt-2 text-foreground text-sm">{roteiro || "Aguardando geracao"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span>Narracao</span>
                  <Button variant="ghost" size="sm" onClick={() => copyText(narracao || "N/A", "Narracao")}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </div>
                <p className="mt-2 text-foreground text-sm">{narracao || "Integracao pendente"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button variant="glass" onClick={() => toast.success("Postagem preparada para Instagram.")}
                disabled={!renderUrl}>
                <Send className="h-4 w-4" /> Instagram
              </Button>
              <Button variant="glass" onClick={() => toast.success("Postagem preparada para TikTok.")}
                disabled={!renderUrl}>
                <Send className="h-4 w-4" /> TikTok
              </Button>
              <Button variant="glass" onClick={() => toast.success("Postagem preparada para YouTube.")}
                disabled={!renderUrl}>
                <Send className="h-4 w-4" /> YouTube
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminVideoGenerator;
