import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminVoices = () => {
  return (
    <AdminLayout title="Vozes / Narracao" description="ElevenLabs e presets premium">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Biblioteca de vozes</h2>
            <p className="text-xs text-muted-foreground">Selecione a voz comercial premium</p>
          </div>
          <Badge variant="secondary">ElevenLabs pendente</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["Masculina Comercial", "Autoridade Premium", "Feminina Luxo"].map((voice) => (
            <div key={voice} className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold">{voice}</p>
              <p className="text-xs text-muted-foreground">Tom equilibrado e impacto comercial.</p>
              <div className="flex gap-2">
                <Button variant="glass" size="sm" onClick={() => toast.message("Preview de voz iniciado.") }>
                  Pre-escutar
                </Button>
                <Button variant="neon" size="sm" onClick={() => toast.success("Voz definida como padrao.") }>
                  Ativar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminVoices;
