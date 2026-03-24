import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminScripts = () => {
  return (
    <AdminLayout title="Roteiros" description="Biblioteca de roteiros comerciais">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Roteiros recentes</h2>
            <p className="text-xs text-muted-foreground">Gerados por IA com fallback ativo</p>
          </div>
          <Badge variant="secondary">128 roteiros</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: "Luxo Premium", status: "CONCLUIDO" },
            { title: "Fitness Instant", status: "PROCESSANDO" },
            { title: "Saude Vital", status: "CONCLUIDO" },
            { title: "Tech Impact", status: "ERRO" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{item.title}</span>
                <span
                  className={`status-pill ${
                    item.status === "CONCLUIDO"
                      ? "status-complete"
                      : item.status === "PROCESSANDO"
                        ? "status-processing"
                        : "status-error"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Hook, desenvolvimento e CTA prontos para campanha.
              </p>
              <Button variant="glass" size="sm">
                Abrir roteiro
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminScripts;
