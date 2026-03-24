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

const AdminLogs = () => {
  return (
    <AdminLayout title="Logs do Sistema" description="Monitoramento e auditoria">
      <div className="cinema-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Eventos recentes</h2>
          <Badge variant="secondary">Tempo real</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horario</TableHead>
              <TableHead>Servico</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { time: "20:02", service: "Pipeline", msg: "Fallback SEO aplicado", status: "PROCESSANDO" },
              { time: "19:58", service: "Render", msg: "Video exportado", status: "CONCLUIDO" },
              { time: "19:55", service: "Social", msg: "Autopost agendado", status: "CONCLUIDO" },
            ].map((row) => (
              <TableRow key={row.time + row.service}>
                <TableCell className="text-xs text-muted-foreground">{row.time}</TableCell>
                <TableCell>{row.service}</TableCell>
                <TableCell>{row.msg}</TableCell>
                <TableCell>
                  <span
                    className={`status-pill ${
                      row.status === "CONCLUIDO" ? "status-complete" : "status-processing"
                    }`}
                  >
                    {row.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
