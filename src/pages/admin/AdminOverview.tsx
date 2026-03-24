import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminOverview = () => {
  const stats = [
    { label: "Videos gerados hoje", value: "148", trend: "+12%", tone: "text-emerald-300" },
    { label: "Renderizacoes em andamento", value: "23", trend: "Processando", tone: "text-cyan-300" },
    { label: "Renderizacoes concluidas", value: "1.284", trend: "Ultimos 7 dias", tone: "text-blue-300" },
    { label: "Falhas de processamento", value: "4", trend: "Fallback ativo", tone: "text-rose-300" },
    { label: "APIs conectadas", value: "6", trend: "Runway + Pika", tone: "text-amber-300" },
    { label: "Publicacoes feitas", value: "92", trend: "Auto-post", tone: "text-emerald-300" },
  ];

  const dailyData = [48, 72, 66, 98, 130, 110, 142];
  const max = Math.max(...dailyData);

  return (
    <AdminLayout
      title="Visao Geral"
      description="Visao executiva do motor cinematografico"
      actionLabel="Gerar video cinematografico"
    >
      <section className="cinema-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Mensagem central</p>
            <h2 className="text-2xl font-semibold mt-2">
              Transforme uma simples imagem de produto em um video cinematografico altamente comercial.
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Upload, roteiro, voz, trilha e renderizacao automatica em um unico fluxo.
            </p>
          </div>
          <Button variant="neon">Gerar video agora</Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((item) => (
          <div key={item.label} className="cinema-panel p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <div className="flex items-end justify-between mt-3">
              <span className="text-2xl font-semibold">{item.value}</span>
              <span className={`text-xs ${item.tone}`}>{item.trend}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="cinema-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Geracao por dia</h3>
              <p className="text-xs text-muted-foreground">Ultimos 7 dias</p>
            </div>
            <Badge variant="secondary">+18% semana</Badge>
          </div>
          <div className="grid grid-cols-7 gap-3 items-end h-40">
            {dailyData.map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-md bg-gradient-to-t from-[#f5c451] to-[#3b82f6]"
                  style={{ height: `${(value / max) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">D{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cinema-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Taxa de sucesso</h3>
              <p className="text-xs text-muted-foreground">Render + publicacao</p>
            </div>
            <Badge variant="secondary">98%</Badge>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Render cinematografico</span>
                <span>96%</span>
              </div>
              <Progress value={96} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Publicacao automatica</span>
                <span>92%</span>
              </div>
              <Progress value={92} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fallback inteligente</span>
                <span>100%</span>
              </div>
              <Progress value={100} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="cinema-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Fila de render</h3>
            <Badge variant="secondary">23 em andamento</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Produto Luxo", status: "PROCESSANDO", progress: 62, eta: "2m" },
                { name: "Fitness Boost", status: "PROCESSANDO", progress: 34, eta: "4m" },
                { name: "Tech Capsule", status: "ONLINE", progress: 12, eta: "6m" },
              ].map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <span className="status-pill status-processing">{row.status}</span>
                  </TableCell>
                  <TableCell>
                    <Progress value={row.progress} />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{row.eta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="cinema-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Status das APIs</h3>
            <Badge variant="secondary">6 conectadas</Badge>
          </div>
          <div className="space-y-3">
            {[
              { name: "Runway", status: "ONLINE", cls: "status-online" },
              { name: "Pika", status: "ONLINE", cls: "status-online" },
              { name: "ElevenLabs", status: "DESCONECTADO", cls: "status-disconnected" },
              { name: "Instagram", status: "PROCESSANDO", cls: "status-processing" },
            ].map((api) => (
              <div key={api.name} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
                <span className="text-sm">{api.name}</span>
                <span className={`status-pill ${api.cls}`}>{api.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cinema-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Logs recentes</h3>
          <Badge variant="secondary">Sistema estavel</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Horario</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { time: "19:42", event: "Render final entregue", status: "CONCLUIDO", origin: "Runway" },
              { time: "19:36", event: "Fallback SEO aplicado", status: "PROCESSANDO", origin: "IA" },
              { time: "19:30", event: "Autopost agendado", status: "CONCLUIDO", origin: "Scheduler" },
            ].map((log) => (
              <TableRow key={log.time}>
                <TableCell className="text-xs text-muted-foreground">{log.time}</TableCell>
                <TableCell>{log.event}</TableCell>
                <TableCell>
                  <span className="status-pill status-complete">{log.status}</span>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{log.origin}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </AdminLayout>
  );
};

export default AdminOverview;
