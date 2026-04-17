import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Database,
  Film,
  RefreshCw,
  TrendingUp,
  Zap,
  Mic,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Insight {
  level: "info" | "warning" | "danger" | "success";
  text: string;
}

interface Metrics {
  ok: boolean;
  videos: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    today: number;
    last_7_days: number;
    success_rate: number;
    avg_duration_sec: number;
  };
  voice_cache: { files: number; size_kb: number; size_mb: number };
  pipeline_v2: { total: number; concluidos: number; erro: number };
  ceo: {
    videos_per_day: { date: string; total: number; completed: number }[];
    provider_count: { elevenlabs: number; openai: number; webspeech: number; cache: number };
    errors_by_step: Record<string, number>;
    insights: Insight[];
  };
  generated_at: string;
}

const MetricsDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("metrics-summary", { body: {} });
      if (error) throw error;
      setMetrics(data as Metrics);
    } catch (e) {
      console.error("[metrics] load error", e);
      toast.error("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmtDuration = (s: number) => {
    if (s <= 0) return "—";
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const cards = metrics
    ? [
        { label: "Total de vídeos", value: metrics.videos.total, icon: Film, gradient: "from-primary to-purple-500" },
        { label: "Taxa de sucesso", value: `${metrics.videos.success_rate}%`, icon: TrendingUp, gradient: "from-green-500 to-emerald-500" },
        { label: "Tempo médio", value: fmtDuration(metrics.videos.avg_duration_sec), icon: Clock, gradient: "from-cyan-500 to-blue-500" },
        { label: "Cache de voz", value: `${metrics.voice_cache.files} arquivos`, icon: Database, gradient: "from-amber-500 to-orange-500" },
      ]
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-card text-foreground">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" /> CEO Mode
              </h1>
              <p className="text-sm text-muted-foreground">
                Painel executivo: visão, insights e ações
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* 🧠 INSIGHTS — primeiro, é o diferencial */}
        {metrics && metrics.ceo.insights.length > 0 && (
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-5 shadow-lg space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Insights automáticos
            </h2>
            <div className="space-y-2">
              {metrics.ceo.insights.map((i, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-sm ${
                    i.level === "danger"
                      ? "bg-red-500/10 border-red-500/30 text-red-200"
                      : i.level === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : i.level === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-200"
                  }`}
                >
                  {i.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
            >
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shrink-0`}>
                <c.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-semibold">{loading ? "…" : c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 📈 Gráfico 30 dias */}
        {metrics && (
          <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" /> Vídeos nos últimos 30 dias
            </h2>
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.ceo.videos_per_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => fmtDay(String(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Gerados"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Concluídos"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status + Providers + Cache */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status breakdown */}
            <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Status dos vídeos
              </h2>
              <Row label="✅ Concluídos" value={metrics.videos.completed} total={metrics.videos.total} color="bg-green-500" />
              <Row label="⚙️ Processando" value={metrics.videos.processing} total={metrics.videos.total} color="bg-cyan-500" />
              <Row label="❌ Com erro" value={metrics.videos.failed} total={metrics.videos.total} color="bg-red-500" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <MiniStat label="Hoje" value={metrics.videos.today} />
                <MiniStat label="Últimos 7 dias" value={metrics.videos.last_7_days} />
              </div>
            </div>

            {/* Cache + Pipeline V2 */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Cache de Voz
                </h2>
                <p className="text-xs text-muted-foreground">Áudios reutilizados — economia de API</p>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Arquivos" value={metrics.voice_cache.files} />
                  <MiniStat label="Tamanho" value={`${metrics.voice_cache.size_mb} MB`} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-3">
                <h2 className="text-lg font-semibold">⚡ Pipeline V2</h2>
                <Row label="Total" value={metrics.pipeline_v2.total} total={Math.max(1, metrics.pipeline_v2.total)} color="bg-primary" />
                <Row label="Concluídos" value={metrics.pipeline_v2.concluidos} total={Math.max(1, metrics.pipeline_v2.total)} color="bg-green-500" />
                <Row label="Erros" value={metrics.pipeline_v2.erro} total={Math.max(1, metrics.pipeline_v2.total)} color="bg-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* 🎤 Providers + Erros por etapa */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-400" /> Provider de voz
              </h2>
              <p className="text-xs text-muted-foreground">Distribuição de motores de TTS</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <MiniStat label="ElevenLabs" value={metrics.ceo.provider_count.elevenlabs} />
                <MiniStat label="OpenAI" value={metrics.ceo.provider_count.openai} />
                <MiniStat label="Cache" value={metrics.ceo.provider_count.cache} />
                <MiniStat label="WebSpeech / outros" value={metrics.ceo.provider_count.webspeech} />
              </div>
            </div>

            <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Erros por etapa
              </h2>
              {Object.keys(metrics.ceo.errors_by_step).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  ✅ Nenhum erro registrado nas etapas do pipeline.
                </p>
              ) : (
                <div className="space-y-2 pt-2">
                  {Object.entries(metrics.ceo.errors_by_step)
                    .sort((a, b) => b[1] - a[1])
                    .map(([step, count]) => (
                      <Row
                        key={step}
                        label={step}
                        value={count}
                        total={Math.max(...Object.values(metrics.ceo.errors_by_step))}
                        color="bg-red-500"
                      />
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {metrics && (
          <p className="text-[11px] text-muted-foreground text-right">
            Atualizado em {new Date(metrics.generated_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>
    </main>
  );
};

const Row = ({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="capitalize">{label}</span>
        <span className="text-muted-foreground">
          {value} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border/20 bg-muted/10 p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default MetricsDashboard;
