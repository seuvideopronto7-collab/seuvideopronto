import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminRenders = () => {
  return (
    <AdminLayout title="Renderizacoes" description="Fila, jobs e status real">
      <div className="cinema-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Fila de render</h2>
            <p className="text-xs text-muted-foreground">Monitoramento em tempo real</p>
          </div>
          <Badge variant="secondary">23 ativos</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provedor</TableHead>
              <TableHead className="text-right">Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { id: "R-201", name: "Luxo Gold", status: "PROCESSANDO", provider: "Runway", time: "1m" },
              { id: "R-202", name: "Tech Boost", status: "PROCESSANDO", provider: "Pika", time: "3m" },
              { id: "R-199", name: "Saude Pro", status: "CONCLUIDO", provider: "Local", time: "6m" },
              { id: "R-198", name: "Fitness Prime", status: "ERRO", provider: "Runway", time: "-" },
            ].map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs text-muted-foreground">{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <span
                    className={`status-pill ${
                      row.status === "CONCLUIDO"
                        ? "status-complete"
                        : row.status === "PROCESSANDO"
                          ? "status-processing"
                          : row.status === "ERRO"
                            ? "status-error"
                            : "status-disconnected"
                    }`}
                  >
                    {row.status}
                  </span>
                </TableCell>
                <TableCell>{row.provider}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{row.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminRenders;
