import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";

const AdminAnalytics = () => {
  return (
    <AdminLayout title="Analytics" description="Insights de uso e exportacao">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Videos mais exportados</h2>
            <Badge variant="secondary">Top 5</Badge>
          </div>
          <div className="space-y-3">
            {["Luxo Gold", "Tech Pro", "Fitness Rise", "Saude Max", "Viral Lab"].map((name) => (
              <div key={name} className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                {name}
              </div>
            ))}
          </div>
        </div>
        <div className="cinema-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Origem dos uploads</h2>
            <Badge variant="secondary">Ultimos 7 dias</Badge>
          </div>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Upload manual</span>
              <span>58%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>API integrada</span>
              <span>27%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Automacao 30 dias</span>
              <span>15%</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
