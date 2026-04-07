import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Loader2, Youtube, Instagram, User, Crown, Video, Download, Repeat2, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { formatLimitLabel, getPlanLabel } from "@/lib/plans";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import HomeHeader from "@/components/home/HomeHeader";

const UserDashboard = () => {
  const { user, profile, refreshProfile, signOut, isAdmin, isFounder } = useAuth();
  const navigate = useNavigate();
  const { planId, limits, usage } = usePlan();
  const [saving, setSaving] = useState(false);
  const [videoJobs, setVideoJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "",
    whatsapp: "",
    youtube_channel: "",
    instagram: "",
    tiktok: "",
  });

  const avatarUrl = avatarPreview || profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const displayName = profile?.full_name || user?.user_metadata?.name || "Usuário";
  const initials = displayName.slice(0, 2).toUpperCase();

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
      if (error) console.error("Erro ao carregar histórico", error);
      else setVideoJobs(data || []);
      setLoadingJobs(false);
    };
    void loadJobs();
  }, [profile?.id]);

  const videoLimit = useMemo(() => {
    const limit = limits?.videos_dia;
    if (typeof limit !== "number" || !Number.isFinite(limit)) return null;
    return limit;
  }, [limits]);

  const videosUsed = useMemo(() => (usage as any)?.videos_dia || 0, [usage]);
  const remaining = useMemo(() => (videoLimit === null ? "Ilimitado" : Math.max(0, videoLimit - videosUsed)), [videoLimit, videosUsed]);

  // ── Avatar upload ──
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return;
    }

    // Instant preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      await refreshProfile();
      toast.success("Foto atualizada!");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Falha ao enviar foto.");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

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
      <HomeHeader />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* ── Avatar + Name section ── */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border/30">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Clique na foto para alterar</p>
            </div>
          </div>
        </div>

        {/* ── Plan ── */}
        <div className="glass-card p-6 space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              <div>
                <h2 className="text-lg font-semibold">Plano atual</h2>
                <p className="text-xs text-muted-foreground">{getPlanLabel(planId)}</p>
                {isFounder && <p className="text-xs text-accent">👑 Founder — Acesso ilimitado</p>}
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

        {/* ── Video history ── */}
        <div className="glass-card p-6 space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Histórico de vídeos</h2>
          </div>
          {loadingJobs && <div className="text-xs text-muted-foreground">Carregando histórico...</div>}
          {!loadingJobs && videoJobs.length === 0 && (
            <div className="text-xs text-muted-foreground">Nenhum vídeo gerado ainda.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoJobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3 transition-all duration-200 hover:scale-[1.01]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{job.id.slice(0, 8)}...</span>
                  <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {job.status || "pending"}
                  </span>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 overflow-hidden">
                  {job.image_url ? (
                    <img src={job.image_url} alt="thumbnail" className="w-full h-32 object-cover" loading="lazy" />
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

        {/* ── Profile form ── */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Dados do Perfil</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome Completo</label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="bg-muted/50 border-border/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">WhatsApp</label>
              <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="bg-muted/50 border-border/50" />
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
                <Input placeholder="@seucanal" value={form.youtube_channel} onChange={(e) => update("youtube_channel", e.target.value)} className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram
                </label>
                <Input placeholder="@seuinsta" value={form.instagram} onChange={(e) => update("instagram", e.target.value)} className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1">TikTok</label>
                <Input placeholder="@seutiktok" value={form.tiktok} onChange={(e) => update("tiktok", e.target.value)} className="bg-muted/50 border-border/50" />
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
