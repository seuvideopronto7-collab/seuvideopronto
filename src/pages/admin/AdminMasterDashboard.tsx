import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Clapperboard, Cloud, Cpu, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";

const AdminMasterDashboard = () => {
  const navigate = useNavigate();

  const stats = useMemo(
    () => [
      { label: "Vídeos gerados hoje", value: "38", icon: Clapperboard },
      { label: "Processamentos ativos", value: "5", icon: Activity },
      { label: "APIs conectadas", value: "7", icon: Cloud },
      { label: "Usuários ativos", value: "124", icon: Users },
    ],
    [],
  );

  const systemStatus = [
    { label: "Runway", status: "online" },
    { label: "ElevenLabs", status: "online" },
    { label: "Upload", status: "ok" },
  ];

  return (
    <AdminLayout title="Dashboard Admin" description="Controle total do sistema e distribuição">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="cinema-panel p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#7B2FFF]/20 text-[#7B2FFF] flex items-center justify-center">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Status do sistema</h2>
              <p className="text-xs text-muted-foreground">Monitoramento em tempo real</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-3 py-1 text-xs font-semibold text-[#00E5FF]">
              <Cpu className="h-3.5 w-3.5" />
              Core online
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {systemStatus.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-white mt-2">
                  {item.status === "online" ? "Online" : item.status === "ok" ? "Ok" : "Offline"}
                </p>
                <div className="mt-3 h-1 rounded-full bg-white/10">
                  <div className="h-1 w-3/4 rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#00E5FF]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Atalhos rápidos</h2>
          <p className="text-xs text-muted-foreground">Ações críticas com um clique</p>
          <div className="grid gap-3">
            <Button variant="neon" onClick={() => navigate("/admin/video-generator")}>
              Gerar vídeo agora
            </Button>
            <Button variant="glass" onClick={() => navigate("/admin/distribution")}>
              Nova distribuição
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/distribution")}>
              Ver central
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMasterDashboard;
