import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Loader2, Youtube, Instagram, User, Crown, Video, Download, Repeat2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { formatLimitLabel, getPlanLabel } from "@/lib/plans";

const UserDashboard = () => {
  const { profile, refreshProfile, signOut, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const { planId, limits, usage } = usePlan();
  const [saving, setSaving] = useState(false);
  const [videoJobs, setVideoJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    whatsapp: "",
    youtube_channel: "",
    instagram: "",
    tiktok: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        whatsapp: profile.whatsapp,
        youtube_channel: profile.youtube_channel,
        instagram: profile.instagram,
        tiktok: profile.tiktok,
      });
    }
  }, [profile]);

  useEffect(() => {
    const loadJobs = async () => {
      if (!profile?.id) return;
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from("video_jobs" as any)
        .select("id,status,created_at,video_url,image_url")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) {
        console.error("Erro ao carregar histórico", error);
      } else {
        setVideoJobs(data || []);
      }
      setLoadingJobs(false);
    };
    void loadJobs();
  }, [profile?.id]);

  const videoLimit = useMemo(() => {
    const limit = limits?.videos_dia;
    if (typeof limit !== "number") return null;
    if (!Number.isFinite(limit)) return null;
    return limit;
  }, [limits]);

  const videosUsed = useMemo(() => (usage as any)?.videos_dia || 0, [usage]);
  const remaining = useMemo(() => (videoLimit === null ? "Ilimitado" : Math.max(0, videoLimit - videosUsed)), [videoLimit, videosUsed]);

  const handleDownload = (url?: string | null) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = "video-final.mp4";
    link.click();
  };

  const handleRepost = (jobId: string) => {
    toast.message(`Repost programado para ${jobId}`);
  };

  const update = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        whatsapp: form.whatsapp,
        youtube_channel: form.youtube_channel,
        instagram: form.instagram,
        tiktok: form.tiktok,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados salvos com sucesso! ✅");
      await refreshProfile();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Meu Perfil</h1>
              <p className="text-xs text-muted-foreground">Complete seus dados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Sistema
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="glass-card p-6 space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-neon-cyan" />
              <div>
                <h2 className="text-lg font-semibold">Plano atual</h2>
                <p className="text-xs text-muted-foreground">{getPlanLabel(planId)}</p>
                {isFounder && (
                  <p className="text-xs text-neon-cyan">👑 Founder — Acesso ilimitado</p>
                )}
              </div>
            </div>
            {!isFounder && (
              <Button variant="neon" size="sm" onClick={() => navigate("/planos")}>Fazer upgrade</Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Vídeos gerados</div>
              <div className="text-lg font-semibold">{videoJobs.length}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Limite restante</div>
              <div className="text-lg font-semibold">{remaining}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-lg font-semibold">Ativo</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Controle diário de uso</div>
            <Button variant="glass" size="sm" onClick={() => navigate("/")}>Gerar novo vídeo</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(limits)
              .filter(([, value]) => typeof value === "number")
              .map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatLimitLabel(key)}</span>
                    <span className="font-mono text-primary">
                      {(usage as any)[key] || 0}/{Number.isFinite(value as number) ? (value as number) : "∞"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="glass-card p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-lg font-semibold">Histórico de vídeos</h2>
          </div>
          {loadingJobs && <div className="text-xs text-muted-foreground">Carregando histórico...</div>}
          {!loadingJobs && videoJobs.length === 0 && (
            <div className="text-xs text-muted-foreground">Nenhum vídeo gerado ainda.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoJobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{job.id}</span>
                  <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {job.status || "pending"}
                  </span>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 overflow-hidden">
                  {job.image_url ? (
                    <img src={job.image_url} alt="thumbnail" className="w-full h-32 object-cover" />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
                      Sem thumbnail
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {job.created_at ? new Date(job.created_at).toLocaleString() : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="glass" size="sm" onClick={() => handleDownload(job.video_url)} disabled={!job.video_url}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                  <Button variant="glass" size="sm" onClick={() => handleRepost(job.id)}>
                    <Repeat2 className="w-4 h-4" /> Repostar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-neon-pink" />
            <h2 className="text-lg font-semibold">Dados do Perfil</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome Completo</label>
              <Input
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">WhatsApp</label>
              <Input
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value)}
                className="bg-muted/50 border-border/50"
              />
            </div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Youtube className="w-4 h-4" /> Redes Sociais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Youtube className="w-3 h-3" /> Canal do YouTube
                </label>
                <Input
                  placeholder="@seucanal"
                  value={form.youtube_channel}
                  onChange={(e) => update("youtube_channel", e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram
                </label>
                <Input
                  placeholder="@seuinsta"
                  value={form.instagram}
                  onChange={(e) => update("instagram", e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  TikTok
                </label>
                <Input
                  placeholder="@seutiktok"
                  value={form.tiktok}
                  onChange={(e) => update("tiktok", e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
            </div>
          </div>

          <Button variant="neon" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Dados
          </Button>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
