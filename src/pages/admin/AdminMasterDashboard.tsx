import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Clapperboard, Cloud, Cpu, Users, TrendingUp, Video, BarChart3 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Stats {
  totalVideos: number;
  activeJobs: number;
  totalUsers: number;
  completedToday: number;
  failedJobs: number;
  avgProgress: number;
}

interface RecentJob {
  id: string;
  status: string;
  progress: number;
  created_at: string;
  prompt: string | null;
  video_url: string | null;
}

const AdminMasterDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalVideos: 0,
    activeJobs: 0,
    totalUsers: 0,
    completedToday: 0,
    failedJobs: 0,
    avgProgress: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [videosRes, usersRes, activeRes, recentRes] = await Promise.all([
          supabase.from("video_jobs").select("id, status, progress, created_at", { count: "exact" }),
          supabase.from("profiles").select("id", { count: "exact" }),
          supabase.from("video_jobs").select("id", { count: "exact" }).in("status", ["started", "generating_script", "generating_voice", "generating_video", "processing"]),
          supabase.from("video_jobs").select("id, status, progress, created_at, prompt, video_url").order("created_at", { ascending: false }).limit(10),
        ]);

        const allJobs = videosRes.data || [];
        const today = new Date().toISOString().slice(0, 10);
        const completedToday = allJobs.filter(
          (j: any) => j.status === "completed" && j.created_at?.startsWith(today)
        ).length;
        const failedJobs = allJobs.filter((j: any) => j.status === "error" || j.status === "failed").length;
        const progresses = allJobs.map((j: any) => j.progress || 0);
        const avgProgress = progresses.length > 0 ? Math.round(progresses.reduce((a: number, b: number) => a + b, 0) / progresses.length) : 0;

        setStats({
          totalVideos: videosRes.count || 0,
          activeJobs: activeRes.count || 0,
          totalUsers: usersRes.count || 0,
          completedToday,
          failedJobs,
          avgProgress,
        });
        setRecentJobs((recentRes.data as any) || []);
      } catch (e) {
        console.error("Failed to fetch admin stats:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Realtime updates for video_jobs
    const channel = supabase
      .channel("admin-video-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_jobs" }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Total de vídeos", value: stats.totalVideos, icon: Clapperboard, color: "from-primary to-purple-500" },
    { label: "Jobs ativos", value: stats.activeJobs, icon: Activity, color: "from-cyan-500 to-blue-500" },
    { label: "Usuários", value: stats.totalUsers, icon: Users, color: "from-green-500 to-emerald-500" },
    { label: "Concluídos hoje", value: stats.completedToday, icon: TrendingUp, color: "from-amber-500 to-orange-500" },
  ];

  const statusColor = (status: string) => {
    if (status === "completed") return "text-green-400";
    if (status === "error" || status === "failed") return "text-red-400";
    if (status === "fallback") return "text-amber-400";
    return "text-cyan-400";
  };

  return (
    <AdminLayout title="Dashboard CEO" description="Controle total do sistema — métricas em tempo real">
      <div className="w-full min-w-0 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${item.color} bg-opacity-20 flex items-center justify-center shrink-0`}>
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {loading ? "..." : item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent jobs — 2 cols */}
            <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" /> Jobs recentes
                  </h2>
                  <p className="text-xs text-muted-foreground">Últimos 10 processamentos</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Cpu className="h-3.5 w-3.5" />
                  {stats.activeJobs} ativos
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-border/20 bg-muted/10 p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold uppercase ${statusColor(job.status)}`}>
                          {job.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground font-mono truncate">
                          {job.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                        {job.prompt || "Sem prompt"}
                      </p>
                      <Progress value={job.progress} className="h-1 mt-2" />
                    </div>
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {new Date(job.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                {recentJobs.length === 0 && !loading && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum job encontrado</p>
                )}
              </div>
            </div>

            {/* Right panel — 1 col */}
            <div className="space-y-6">
              {/* KPIs */}
              <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> KPIs
                </h2>
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-border/20 bg-muted/10 p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taxa de sucesso</span>
                    <span className="text-lg font-semibold text-green-400">
                      {stats.totalVideos > 0
                        ? Math.round(((stats.totalVideos - stats.failedJobs) / stats.totalVideos) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/20 bg-muted/10 p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Falhas totais</span>
                    <span className="text-lg font-semibold text-red-400">{stats.failedJobs}</span>
                  </div>
                  <div className="rounded-xl border border-border/20 bg-muted/10 p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Progresso médio</span>
                    <span className="text-lg font-semibold text-primary">{stats.avgProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-4">
                <h2 className="text-lg font-semibold">Atalhos rápidos</h2>
                <div className="flex flex-col gap-3">
                  <Button variant="neon" onClick={() => navigate("/admin/video-generator")}>
                    🎬 Gerar vídeo agora
                  </Button>
                  <Button variant="glass" onClick={() => navigate("/admin/users")}>
                    👥 Gerenciar usuários
                  </Button>
                  <Button variant="glass" onClick={() => navigate("/admin/distribution")}>
                    📤 Nova distribuição
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/admin/logs")}>
                    📋 Ver logs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMasterDashboard;
