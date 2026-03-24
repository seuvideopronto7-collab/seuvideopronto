import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminPlans = () => {
  return (
    <AdminLayout title="Planos" description="Controle de limites e upgrades">
      <div className="cinema-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Planos ativos</h2>
          <Badge variant="secondary">3 niveis</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "Starter", price: "R$ 97", limit: "10 renders/dia" },
            { name: "Studio", price: "R$ 297", limit: "50 renders/dia" },
            { name: "Enterprise", price: "R$ 997", limit: "Ilimitado" },
          ].map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.limit}</p>
              <p className="text-xl font-semibold">{plan.price}</p>
              <Button variant="glass" size="sm">Editar plano</Button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
