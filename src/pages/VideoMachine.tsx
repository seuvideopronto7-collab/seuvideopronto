import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, RefreshCw, Download, Eye, Copy, RotateCcw, Loader2, AlertTriangle, CheckCircle2, Clock, Clapperboard, Scissors, FileText, Music, ExternalLink, Rocket, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import BackButton from "@/components/BackButton";
import { generateCapCutKit, downloadTextFile, resolveTemplate, CAPCUT_TEMPLATES, type CapCutKit } from "@/lib/capCutKit";

type JobStage = "a_fazer" | "roteiro" | "narracao" | "imagens" | "video" | "concluido";
type JobStatus = "aguardando" | "processando" | "concluido" | "erro" | "cancelado";

interface PipelineJob {
  id: string;
  title: string;
  input_type: string;
  platform: string;
  duration: string;
  objective: string;
  niche: string;
  audience: string;
  voice: string;
  cta: string;
  copy_base: string;
  visual_style: string;
  reference_image_url: string | null;
  current_stage: JobStage;
  status: JobStatus;
  progress: number;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  script_mode: string;
  aspect_ratio: string;
  created_at: string;
  updated_at: string | null;
}

const STAGES: { key: JobStage; label: string; icon: React.ReactNode }[] = [
  { key: "a_fazer", label: "A Fazer", icon: <Clock className="w-4 h-4" /> },
  { key: "roteiro", label: "Roteiro", icon: <Clapperboard className="w-4 h-4" /> },
  { key: "narracao", label: "Narração", icon: <Clapperboard className="w-4 h-4" /> },
  { key: "imagens", label: "Imagens", icon: <Clapperboard className="w-4 h-4" /> },
  { key: "video", label: "Vídeo", icon: <Clapperboard className="w-4 h-4" /> },
  { key: "concluido", label: "Concluído", icon: <CheckCircle2 className="w-4 h-4" /> },
];

const STATUS_COLORS: Record<JobStatus, string> = {
  aguardando: "bg-muted text-muted-foreground",
  processando: "bg-primary/20 text-primary",
  concluido: "bg-green-500/20 text-green-400",
  erro: "bg-destructive/20 text-destructive",
  cancelado: "bg-muted text-muted-foreground",
};

const VideoMachine = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    input_type: "ideia" as string,
    platform: "reels" as string,
    duration: "30s",
    objective: "vendas" as string,
    niche: "",
    audience: "",
    voice: "feminina",
    cta: "",
    copy_base: "",
    visual_style: "premium_escuro",
    script_mode: "comercial",
    aspect_ratio: "9:16",
  });

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("pipeline_jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar jobs:", error);
      return;
    }
    setJobs((data as unknown as PipelineJob[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchJobs();
    // Polling leve a cada 3s
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-jobs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_jobs" }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const handleCreate = async () => {
    if (!user || !form.title.trim()) {
      toast.error("Preencha pelo menos o título");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("pipeline_jobs").insert({
        user_id: user.id,
        title: form.title,
        input_type: form.input_type as any,
        platform: form.platform as any,
        duration: form.duration,
        objective: form.objective as any,
        niche: form.niche,
        audience: form.audience,
        voice: form.voice,
        cta: form.cta,
        copy_base: form.copy_base,
        visual_style: form.visual_style,
        script_mode: form.script_mode,
        aspect_ratio: form.aspect_ratio,
      });

      if (error) throw error;
      const { data: newJobs } = await supabase.from("pipeline_jobs").select("id").order("created_at", { ascending: false }).limit(1);
      toast.success("Job criado! Iniciando pipeline...");
      setShowCreate(false);
      setForm({ title: "", input_type: "ideia", platform: "reels", duration: "30s", objective: "vendas", niche: "", audience: "", voice: "feminina", cta: "", copy_base: "", visual_style: "premium_escuro", script_mode: "comercial", aspect_ratio: "9:16" });
      fetchJobs();
      if (newJobs?.[0]?.id) handleProcess(newJobs[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar job");
    } finally {
      setCreating(false);
    }
  };

  const handleProcess = async (jobId: string) => {
    toast.info("Iniciando pipeline...");
    try {
      const { data, error } = await supabase.functions.invoke("orchestrate-pipeline", {
        body: { jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Pipeline em execução!");
      fetchJobs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar pipeline");
    }
  };

  const handleRetry = async (jobId: string) => {
    const { error } = await supabase
      .from("pipeline_jobs")
      .update({ status: "aguardando" as any, error_message: null, current_stage: "a_fazer" as any, progress: 0 } as any)
      .eq("id", jobId);

    if (error) { toast.error("Erro ao reprocessar"); return; }
    toast.success("Reprocessando...");
    fetchJobs();
    handleProcess(jobId);
  };

  const handleDuplicate = async (job: PipelineJob) => {
    if (!user) return;
    const { error } = await supabase.from("pipeline_jobs").insert({
      user_id: user.id,
      title: `${job.title} (cópia)`,
      input_type: job.input_type as any,
      platform: job.platform as any,
      duration: job.duration,
      objective: job.objective as any,
      niche: job.niche,
      audience: job.audience,
      voice: job.voice,
      cta: job.cta,
      copy_base: job.copy_base,
      visual_style: job.visual_style,
      script_mode: job.script_mode,
      aspect_ratio: job.aspect_ratio,
    });

    if (error) toast.error("Erro ao duplicar");
    else { toast.success("Job duplicado!"); fetchJobs(); }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Excluir este job?")) return;
    const { error } = await supabase.from("pipeline_jobs").delete().eq("id", jobId);
    if (error) toast.error("Erro ao excluir");
    else { setJobs((prev) => prev.filter((j) => j.id !== jobId)); toast.success("Excluído"); }
  };

  const getJobsByStage = (stage: JobStage) => jobs.filter((j) => j.current_stage === stage);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <BackButton />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">🎬 Máquina de Vídeo</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline visual de produção — arraste com os olhos, processe com IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Vídeo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Vídeo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Título / Ideia *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Vídeo de vendas para suplemento detox" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de Entrada</Label>
                    <Select value={form.input_type} onValueChange={(v) => setForm({ ...form, input_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ideia">💡 Ideia</SelectItem>
                        <SelectItem value="imagem">🖼️ Imagem</SelectItem>
                        <SelectItem value="produto">📦 Produto</SelectItem>
                        <SelectItem value="autoridade">👤 Autoridade</SelectItem>
                        <SelectItem value="viral">🔥 Viral</SelectItem>
                        <SelectItem value="dark">🌑 Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Plataforma</Label>
                    <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="reels">Reels</SelectItem>
                        <SelectItem value="shorts">Shorts</SelectItem>
                        <SelectItem value="feed">Feed</SelectItem>
                        <SelectItem value="stories">Stories</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Objetivo</Label>
                    <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendas">💰 Vendas</SelectItem>
                        <SelectItem value="autoridade">🏆 Autoridade</SelectItem>
                        <SelectItem value="engajamento">❤️ Engajamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duração</Label>
                    <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5s">5s</SelectItem>
                        <SelectItem value="15s">15s</SelectItem>
                        <SelectItem value="30s">30s</SelectItem>
                        <SelectItem value="1min">1 min</SelectItem>
                        <SelectItem value="2min">2 min</SelectItem>
                        <SelectItem value="4min">4 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nicho</Label>
                    <Input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Ex: saúde, finanças" />
                  </div>
                  <div>
                    <Label>Público</Label>
                    <Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Ex: mulheres 25-40" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Voz</Label>
                    <Select value={form.voice} onValueChange={(v) => setForm({ ...form, voice: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feminina">👩 Feminina</SelectItem>
                        <SelectItem value="masculina">👨 Masculina</SelectItem>
                        <SelectItem value="sem">🔇 Sem narração</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Modo de Roteiro</Label>
                    <Select value={form.script_mode} onValueChange={(v) => setForm({ ...form, script_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comercial">🔥 Comercial</SelectItem>
                        <SelectItem value="autoridade">🏆 Autoridade</SelectItem>
                        <SelectItem value="viral">🚀 Viral</SelectItem>
                        <SelectItem value="dark">🌑 Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Formato</Label>
                    <Select value={form.aspect_ratio} onValueChange={(v) => setForm({ ...form, aspect_ratio: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16 Vertical</SelectItem>
                        <SelectItem value="1:1">1:1 Quadrado</SelectItem>
                        <SelectItem value="16:9">16:9 Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CTA</Label>
                    <Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Ex: Compre agora" />
                  </div>
                </div>
                <div>
                  <Label>Copy / Texto Base</Label>
                  <Textarea value={form.copy_base} onChange={(e) => setForm({ ...form, copy_base: e.target.value })} placeholder="Descreva seu produto, ideia ou roteiro..." rows={3} />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Criar Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{jobs.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Processando</p>
          <p className="text-2xl font-bold text-primary">{jobs.filter((j) => j.status === "processando").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Concluídos</p>
          <p className="text-2xl font-bold text-green-400">{jobs.filter((j) => j.status === "concluido").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Com Erro</p>
          <p className="text-2xl font-bold text-destructive">{jobs.filter((j) => j.status === "erro").length}</p>
        </div>
      </div>

      {/* Pipeline Kanban */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Carregando pipeline...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Clapperboard className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum vídeo ainda</h2>
          <p className="text-muted-foreground mb-4">Crie seu primeiro job e veja a mágica acontecer</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Vídeo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
          {STAGES.map((stage) => {
            const stageJobs = getJobsByStage(stage.key);
            return (
              <div key={stage.key} className="min-w-[220px]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  {stage.icon}
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{stageJobs.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[200px]">
                  {stageJobs.length === 0 && (
                    <div className="border border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
                      Nenhum job
                    </div>
                  )}
                  {stageJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onRetry={handleRetry}
                      onProcess={handleProcess}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const resolveVideoUrl = async (jobId: string): Promise<string | null> => {
  // Check job_assets for final video
  const { data } = await supabase
    .from("job_assets")
    .select("url")
    .eq("job_id", jobId)
    .eq("type", "video")
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.url || null;
};

const handleDownloadVideo = async (jobId: string, title: string) => {
  const url = await resolveVideoUrl(jobId);
  if (!url) {
    toast.error("Vídeo ainda não disponível para download");
    return;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${title || "video"}.mp4`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: native anchor
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "video"}.mp4`;
    a.target = "_blank";
    a.click();
  }
};

const handleCapCutProExport = async (job: PipelineJob) => {
  const videoUrl = await resolveVideoUrl(job.id);
  const kit = generateCapCutKit(job, videoUrl);

  // 1. Download video
  if (videoUrl) {
    await handleDownloadVideo(job.id, job.title);
  }

  // 2. Download roteiro.txt
  downloadTextFile(kit.roteiro, `roteiro-${job.title || "video"}.txt`);

  // 3. Download legendas.json
  downloadTextFile(
    JSON.stringify(kit.legendas, null, 2),
    `legendas-${job.title || "video"}.json`,
    "application/json"
  );

  // 4. Toast with instructions
  toast.success("🚀 Kit CapCut PRO exportado!", {
    description: kit.instrucoes.slice(0, 3).join("\n"),
    duration: 10000,
  });

  // 5. Open CapCut after short delay
  setTimeout(() => {
    window.open("https://www.capcut.com/editor", "_blank");
  }, 2000);

  return kit;
};

const JobCard = ({
  job,
  onRetry,
  onProcess,
  onDuplicate,
  onDelete,
}: {
  job: PipelineJob;
  onRetry: (id: string) => void;
  onProcess: (id: string) => void;
  onDuplicate: (job: PipelineJob) => void;
  onDelete: (id: string) => void;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [kit, setKit] = useState<CapCutKit | null>(null);

  const handleVer = async () => {
    const url = await resolveVideoUrl(job.id);
    if (!url) {
      toast.error("Vídeo ainda não disponível");
      return;
    }
    setPreviewUrl(url);
    setShowPreview(true);
  };

  const handleShowKit = async () => {
    const videoUrl = await resolveVideoUrl(job.id);
    const generatedKit = generateCapCutKit(job, videoUrl);
    setKit(generatedKit);
    setShowKit(true);
  };

  const statusLabel: Record<JobStatus, string> = {
    aguardando: "Aguardando",
    processando: "Processando...",
    concluido: "Concluído ✓",
    erro: "Erro",
    cancelado: "Cancelado",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm line-clamp-2 flex-1">{job.title || "Sem título"}</h3>
        <Badge className={`text-[10px] ml-2 ${STATUS_COLORS[job.status]}`}>
          {statusLabel[job.status]}
        </Badge>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2 flex-wrap">
        <span>{job.platform}</span>
        <span>•</span>
        <span>{job.duration}</span>
        <span>•</span>
        <span>{job.objective}</span>
        {job.status === "concluido" && (
          <>
            <span>•</span>
            <Badge variant="outline" className="text-[9px] border-accent/40 text-accent px-1.5 py-0">
              ✓ Pronto para CapCut
            </Badge>
          </>
        )}
      </div>

      {job.niche && (
        <div className="mb-2">
          <Badge variant="secondary" className="text-[9px]">
            {resolveTemplate(job.niche).label}
          </Badge>
        </div>
      )}

      {job.status === "processando" && (
        <div className="mb-2">
          <Progress value={job.progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">{job.progress}%</p>
        </div>
      )}

      {job.status === "erro" && job.error_message && (
        <div className="flex items-start gap-1 mb-2 bg-destructive/10 rounded-lg p-2">
          <AlertTriangle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
          <p className="text-[10px] text-destructive">{job.error_message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        {job.current_stage === "a_fazer" && job.status === "aguardando" && (
          <Button variant="default" size="sm" className="h-6 text-[10px] px-2" onClick={() => onProcess(job.id)}>
            ▶ Processar
          </Button>
        )}
        {job.status === "erro" && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onRetry(job.id)}>
            <RotateCcw className="w-3 h-3 mr-1" /> Retry
          </Button>
        )}
        {job.status === "concluido" && (
          <>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleVer}>
              <Eye className="w-3 h-3 mr-1" /> Ver
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDownloadVideo(job.id, job.title)}>
              <Download className="w-3 h-3 mr-1" /> MP4
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={handleShowKit}>
              <Package className="w-3 h-3 mr-1" /> Kit
            </Button>
            <Button
              size="sm"
              className="h-7 text-[10px] px-3 bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
              onClick={() => handleCapCutProExport(job)}
            >
              <Scissors className="w-3 h-3 mr-1" /> Editar no CapCut
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => onDuplicate(job)}>
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive" onClick={() => onDelete(job.id)}>
          ✕
        </Button>
      </div>

      {/* Video Preview Dialog */}
      {showPreview && previewUrl && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{job.title || "Preview do Vídeo"}</DialogTitle>
            </DialogHeader>
            <video src={previewUrl} controls autoPlay className="w-full rounded-lg aspect-video bg-black" />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownloadVideo(job.id, job.title)}>
                <Download className="w-4 h-4 mr-2" /> Baixar MP4
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleCapCutProExport(job)}
              >
                <Scissors className="w-4 h-4 mr-2" /> Editar no CapCut
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CapCut Kit Dialog */}
      {showKit && kit && (
        <Dialog open={showKit} onOpenChange={setShowKit}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" /> Kit CapCut PRO
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Script */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">📝 Roteiro</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-line">
                  {kit.roteiro}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadTextFile(kit.roteiro, `roteiro-${job.title}.txt`)}
                >
                  <Download className="w-3 h-3 mr-1" /> Baixar Roteiro (.txt)
                </Button>
              </div>

              {/* Subtitles */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">⏱️ Legendas Sincronizadas</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {kit.legendas.map((l, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="secondary" className="text-[10px] shrink-0">{l.start}s—{l.end}s</Badge>
                      <span>{l.text}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadTextFile(JSON.stringify(kit.legendas, null, 2), `legendas-${job.title}.json`, "application/json")}
                >
                  <Download className="w-3 h-3 mr-1" /> Baixar Legendas (.json)
                </Button>
              </div>

              {/* Music */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">🎵 Música Sugerida</span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  {kit.musicaSugerida}
                </div>
              </div>

              {/* Style */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{kit.estilo}</Badge>
                <span>• CTA: {kit.cta}</span>
              </div>

              {/* Template Info */}
              {kit.template && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-accent" />
                    <span className="text-sm font-semibold">🎨 Template: {kit.template.label}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: kit.template.corPrincipal }} />
                      <span>Cor: {kit.template.corPrincipal}</span>
                      <span className="text-muted-foreground">•</span>
                      <span>Fonte: {kit.template.fonteSugerida}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Efeito: {kit.template.efeitoSugerido}</p>
                    <div className="space-y-1 mt-2">
                      <p className="text-[10px] font-semibold text-primary">Dicas de edição:</p>
                      {kit.template.dicasEdicao.map((d, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">• {d}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                {kit.instrucoes.map((inst, i) => (
                  <p key={i} className="text-xs">{inst}</p>
                ))}
              </div>

              {/* Main CTA */}
              <Button
                className="w-full h-12 text-sm font-bold bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleCapCutProExport(job)}
              >
                <Scissors className="w-4 h-4 mr-2" /> Exportar Tudo + Editar no CapCut
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default VideoMachine;
