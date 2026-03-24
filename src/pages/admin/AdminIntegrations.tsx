import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type IntegrationStatus = "ONLINE" | "PROCESSANDO" | "ERRO" | "DESCONECTADO";

const statusMap: Record<string, IntegrationStatus> = {
  connected: "ONLINE",
  testing: "PROCESSANDO",
  error: "ERRO",
  expired: "DESCONECTADO",
};

const AdminIntegrations = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [items, setItems] = useState<{ name: string; status: IntegrationStatus }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from("integrations" as any)
        .select("platform, status")
        .eq("user_id", profile.id);
      const mapped = ((data || []) as any[]).map((row: any) => ({
        name: row.platform,
        status: statusMap[row.status || ""] || "DESCONECTADO",
      }));
      setItems(mapped);
    };
    fetch();
  }, [profile?.id]);

  return (
    <AdminLayout title="Integracoes API" description="Runway, Pika, ElevenLabs e redes">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Integracoes ativas</h2>
            <p className="text-xs text-muted-foreground">Credenciais protegidas e validacao real</p>
          </div>
          <Button variant="neon" onClick={() => navigate("/apis")}>Gerenciar integracoes</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(items.length ? items : [
            { name: "Runway", status: "DESCONECTADO" },
            { name: "Pika", status: "DESCONECTADO" },
            { name: "ElevenLabs", status: "DESCONECTADO" },
            { name: "Instagram", status: "DESCONECTADO" },
            { name: "TikTok", status: "DESCONECTADO" },
            { name: "YouTube", status: "DESCONECTADO" },
          ]).map((item) => (
            <div key={item.name} className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Ultimo teste: hoje</p>
              </div>
              <span
                className={`status-pill ${
                  item.status === "ONLINE"
                    ? "status-online"
                    : item.status === "PROCESSANDO"
                      ? "status-processing"
                      : item.status === "ERRO"
                        ? "status-error"
                        : "status-disconnected"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIntegrations;
