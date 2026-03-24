import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type VideoItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

const AdminDistribution = () => {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const videos = useMemo<VideoItem[]>(
    () => [
      { id: "vid-001", title: "Produto Premium - VSL 30s", status: "Pronto", createdAt: "Hoje" },
      { id: "vid-002", title: "Infoproduto - CTA Forte", status: "Pronto", createdAt: "Hoje" },
      { id: "vid-003", title: "Série 30 dias - teaser", status: "Processado", createdAt: "Ontem" },
      { id: "vid-004", title: "Dark Flow - produto luxury", status: "Pronto", createdAt: "Ontem" },
    ],
    [],
  );

  const toggle = (id: string) =>
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const getSelectedIds = () => videos.filter((v) => selected[v.id]).map((v) => v.id);

  const distribute = (platform: string) => {
    const ids = getSelectedIds();
    if (!ids.length) {
      toast.error("Selecione ao menos um vídeo.");
      return;
    }
    console.log("Distribuindo para:", platform, ids);
    toast.success(`Distribuição iniciada: ${platform}`);
  };

  return (
    <AdminLayout title="Central de Distribuição" description="Controle de publicação e downloads">
      <div className="cinema-panel p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Vídeos gerados</h2>
            <p className="text-xs text-muted-foreground">Seleção múltipla e envio rápido</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="neon" onClick={() => distribute("Instagram")}>Instagram</Button>
            <Button variant="glass" onClick={() => distribute("TikTok")}>TikTok</Button>
            <Button variant="outline" onClick={() => distribute("YouTube")}>YouTube</Button>
            <Button variant="outline" onClick={() => distribute("Download")}>Download</Button>
          </div>
        </div>

        <div className="grid gap-3">
          {videos.map((video) => (
            <div key={video.id} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!selected[video.id]} onCheckedChange={() => toggle(video.id)} />
                  <div>
                    <p className="text-sm font-semibold text-white">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.createdAt} · {video.status}</p>
                  </div>
                </div>
                <span className="status-pill status-online">PRONTO</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDistribution;
