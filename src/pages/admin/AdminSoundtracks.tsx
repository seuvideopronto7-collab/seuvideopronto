import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminSoundtracks = () => {
  const categories = [
    { name: "Impacto", tone: "status-processing" },
    { name: "Luxo", tone: "status-complete" },
    { name: "Saude", tone: "status-online" },
    { name: "Tecnologia", tone: "status-complete" },
    { name: "Viral", tone: "status-processing" },
  ];

  return (
    <AdminLayout title="Trilhas Sonoras" description="Biblioteca epica por categoria">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Trilhas premium</h2>
            <p className="text-xs text-muted-foreground">Curadoria cinematografica</p>
          </div>
          <Badge variant="secondary">25 trilhas</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((item) => (
            <div key={item.name} className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">Volume e intensidade ajustados.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-pill ${item.tone}`}>ATIVA</span>
                <Button variant="glass" size="sm" onClick={() => toast.message("Preview de trilha iniciado.") }>
                  Preview
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSoundtracks;
