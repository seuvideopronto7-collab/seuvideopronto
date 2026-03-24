import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const AdminSettings = () => {
  return (
    <AdminLayout title="Configuracoes" description="Preferencias do motor cinematografico">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Modo cinema</h2>
            <p className="text-xs text-muted-foreground">Brilho dourado e glow controlado</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Cache inteligente</h2>
            <p className="text-xs text-muted-foreground">Evita retrabalho no pipeline</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fallback automatico</h2>
            <p className="text-xs text-muted-foreground">Nunca travar o fluxo</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Button variant="neon">Salvar configuracoes</Button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
