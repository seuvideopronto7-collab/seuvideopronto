import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Film, Clock, CheckCircle2, AlertCircle } from "lucide-react";

type VideoJob = {
  id: string;
  status: string;
  prompt: string | null;
  video_url: string | null;
  image_url: string | null;
  progress: number;
  created_at: string;
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Na fila", icon: Clock, color: "text-yellow-400" },
  generating_script: { label: "Gerando roteiro", icon: Clock, color: "text-blue-400" },
  generating_voice: { label: "Gerando voz", icon: Clock, color: "text-blue-400" },
  generating_video: { label: "Gerando vídeo", icon: Clock, color: "text-purple-400" },
  completed: { label: "Pronto", icon: CheckCircle2, color: "text-green-400" },
  failed: { label: "Erro", icon: AlertCircle, color: "text-red-400" },
  error: { label: "Erro", icon: AlertCircle, color: "text-red-400" },
};

const VideoSection = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<VideoJob[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("video_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setJobs(data as VideoJob[]);
    };
    load();

    const channel = supabase
      .channel("home-video-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (jobs.length === 0) return null;

  return (
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
            return (
              <div
                key={job.id}
                className="group relative rounded-xl overflow-hidden border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted/30 relative">
                  {job.video_url ? (
                    <video
                      src={job.video_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseOut={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                    />
                  ) : job.image_url ? (
                    <img src={job.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Progress overlay */}
                  {job.status !== "completed" && job.status !== "failed" && job.status !== "error" && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs text-white/80">{cfg.label}</p>
                        {job.progress > 0 && (
                          <p className="text-xs text-primary font-mono">{job.progress}%</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {job.prompt || "Vídeo cinematográfico"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(job.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Download overlay */}
                {job.video_url && (
                  <a
                    href={job.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ⬇ Download
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
