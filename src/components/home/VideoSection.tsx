import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Film, Clock, CheckCircle2, AlertCircle, Trash2, X, Download, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import VideoCardMedia from "./VideoCardMedia";
import { retryVideoJob, isRetryLocked, autoHealJob } from "@/services/video/retryVideoJob";

type VideoJob = {
  id: string;
  user_id: string;
  status: string;
  prompt: string | null;
  video_url: string | null;
  image_url: string | null;
  progress: number;
  created_at: string;
  error?: string | null;
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Na fila", icon: Clock, color: "text-yellow-400" },
  queued: { label: "Na fila", icon: Clock, color: "text-yellow-400" },
  processing: { label: "Processando", icon: Clock, color: "text-blue-400" },
  rendering: { label: "Renderizando", icon: Clock, color: "text-purple-400" },
  script_ready: { label: "Roteiro pronto", icon: Clock, color: "text-blue-400" },
  generating_script: { label: "Gerando roteiro", icon: Clock, color: "text-blue-400" },
  generating_voice: { label: "Gerando voz", icon: Clock, color: "text-blue-400" },
  generating_images: { label: "Gerando imagens", icon: Clock, color: "text-purple-400" },
  generating_video: { label: "Gerando vídeo", icon: Clock, color: "text-purple-400" },
  generating_prompt: { label: "Preparando", icon: Clock, color: "text-blue-400" },
  fallback_completed: { label: "Pronto (fallback)", icon: CheckCircle2, color: "text-green-400" },
  done: { label: "Pronto", icon: CheckCircle2, color: "text-green-400" },
  completed: { label: "Pronto", icon: CheckCircle2, color: "text-green-400" },
  failed: { label: "Erro", icon: AlertCircle, color: "text-red-400" },
  error: { label: "Erro", icon: AlertCircle, color: "text-red-400" },
};

const PROCESSING_STATUSES = new Set([
  "pending", "queued", "processing", "rendering",
  "generating_script", "generating_voice", "generating_images",
  "generating_video", "generating_prompt", "script_ready",
]);

async function toSignedUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.includes("token=") || !url.includes("supabase.co/storage")) return url;
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (!match) return url;
    const [, bucket, path] = match;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(decodeURIComponent(path), 3600);
    if (error || !data?.signedUrl) return url;
    return data.signedUrl;
  } catch {
    return url;
  }
}

const VideoSection = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, { video?: string; image?: string }>>({});

  const handleDelete = async (jobId: string) => {
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return;
    setDeleting(jobId);
    const { error } = await supabase.from("video_jobs").delete().eq("id", jobId);
    if (error) {
      toast.error("Erro ao excluir vídeo");
    } else {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Vídeo excluído");
    }
    setDeleting(null);
  };

  // Retry unificado via helper (gap #2, #3, #4)
  const handleRetry = async (job: VideoJob) => {
    setRetrying(job.id);
    const res = await retryVideoJob({
      id: job.id,
      status: job.status,
      image_url: job.image_url,
      prompt: job.prompt,
    });
    setRetrying(null);
    if (!res.ok) {
      if (res.reason === "LOCKED") toast.warning("Retry já em andamento");
      else if (res.reason === "ALREADY_PROCESSING") toast.warning("Já está processando");
      else toast.error(res.reason || "Falha ao reprocessar");
      return;
    }
    toast.success("Reprocessamento iniciado");
  };

  const resolveUrls = useCallback(async (jobList: VideoJob[]) => {
    const resolved: Record<string, { video?: string; image?: string }> = {};
    await Promise.all(
      jobList.map(async (job) => {
        const [video, image] = await Promise.all([
          toSignedUrl(job.video_url),
          toSignedUrl(job.image_url),
        ]);
        resolved[job.id] = { video: video || undefined, image: image || undefined };
      })
    );
    setSignedUrls(resolved);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Isolamento por usuário (gap #1)
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) {
        setJobs(data as VideoJob[]);
        resolveUrls(data as VideoJob[]);
      }
    };
    load();

    // Realtime filtrado por user_id (gap #1)
    const channel = supabase
      .channel(`home-video-jobs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, resolveUrls]);

  if (jobs.length === 0) return null;

  const formatPrompt = (prompt: string | null) => {
    if (!prompt) return "Vídeo cinematográfico";
    try {
      const parsed = JSON.parse(prompt);
      if (parsed.objetivo) {
        return `${parsed.objetivo} • ${parsed.formato || ""} • ${parsed.duracao || ""}`.replace(/\s+/g, " ").trim();
      }
    } catch {}
    return prompt.length > 60 ? prompt.slice(0, 60) + "…" : prompt;
  };

  return (
    <>
      <section className="px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Film className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold text-foreground">Seus Vídeos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => {
              const cfg = statusConfig[job.status] || statusConfig.pending;
              const Icon = cfg.icon;
              const urls = signedUrls[job.id] || {};
              const isTerminalReady = ["completed", "done", "fallback_completed"].includes(job.status);
              const isReady = isTerminalReady && !!urls.video;
              const isFailed = ["failed", "error"].includes(job.status);
              const canRetry = isFailed && !PROCESSING_STATUSES.has(job.status);

              return (
                <div
                  key={job.id}
                  className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
                >
                  <VideoCardMedia
                    jobId={job.id}
                    videoUrl={urls.video}
                    imageUrl={urls.image}
                    status={job.status}
                    progress={job.progress}
                    isReady={isReady}
                    onPlay={() => isReady && setActiveVideo(urls.video!)}
                  />

                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {formatPrompt(job.prompt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(job.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    {isFailed && job.error && (
                      <p className="text-[10px] text-red-400/80 line-clamp-2">{job.error}</p>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canRetry && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetry(job); }}
                        disabled={retrying === job.id || retryLockRef.current.has(job.id)}
                        className="bg-primary/80 hover:bg-primary text-primary-foreground text-[10px] px-2 py-1 rounded-md flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${retrying === job.id ? "animate-spin" : ""}`} />
                        Tentar
                      </button>
                    )}
                    {urls.video && (
                      <a
                        href={urls.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/70 hover:bg-black/90 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Baixar
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                      disabled={deleting === job.id}
                      className="bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <video
            src={activeVideo}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default VideoSection;
