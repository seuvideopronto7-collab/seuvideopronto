import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AdminSocialPublishing = () => {
  return (
    <AdminLayout title="Publicacao Social" description="Agendamento e autopost de 30 dias">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Calendario de postagens</h2>
              <p className="text-xs text-muted-foreground">Agenda automatica por plataforma</p>
            </div>
            <Badge variant="secondary">30 dias ativos</Badge>
          </div>
          <div className="space-y-3">
            {[
              { day: "Dia 1", platform: "TikTok", status: "AGENDADO" },
              { day: "Dia 2", platform: "Instagram", status: "AGENDADO" },
              { day: "Dia 3", platform: "YouTube", status: "ERRO" },
            ].map((item) => (
              <div key={item.day} className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.day}</p>
                  <p className="text-xs text-muted-foreground">{item.platform}</p>
                </div>
                <span
                  className={`status-pill ${item.status === "AGENDADO" ? "status-processing" : "status-error"}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-6 space-y-4">
          <h2 className="text-lg font-semibold">Controle rapido</h2>
          <p className="text-xs text-muted-foreground">Selecione video pronto e publique agora</p>
          <div className="space-y-2">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
              Nenhuma API conectada? A tela libera download manual e nao trava o fluxo.
            </div>
            <Button variant="neon">Conectar redes</Button>
            <Button variant="glass">Publicar agora</Button>
            <Button variant="glass">Registrar historico</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSocialPublishing;
