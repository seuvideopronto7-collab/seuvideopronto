import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Clock, Database, Film, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  generated_at: string;
}

const MetricsDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("metrics-summary", {
        body: {},
      });
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

  const cards = metrics
    ? [
        {
          label: "Total de vídeos",
          value: metrics.videos.total,
          icon: Film,
          gradient: "from-primary to-purple-500",
        },
        {
          label: "Taxa de sucesso",
          value: `${metrics.videos.success_rate}%`,
          icon: TrendingUp,
          gradient: "from-green-500 to-emerald-500",
        },
        {
          label: "Tempo médio",
          value: fmtDuration(metrics.videos.avg_duration_sec),
          icon: Clock,
          gradient: "from-cyan-500 to-blue-500",
        },
        {
          label: "Cache de voz",
          value: `${metrics.voice_cache.files} arquivos`,
          icon: Database,
          gradient: "from-amber-500 to-orange-500",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-card text-foreground">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" /> Performance dos Vídeos
              </h1>
              <p className="text-sm text-muted-foreground">
                Métricas reais do seu pipeline IA
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-5 shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
            >
              <div
                className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shrink-0`}
              >
                <c.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-semibold">{loading ? "…" : c.value}</p>
              </div>
            </div>
          ))}
          {!metrics && !loading && (
            <div className="md:col-span-2 xl:col-span-4 text-center text-sm text-muted-foreground py-8">
              Sem dados ainda. Gere seu primeiro vídeo para começar.
            </div>
          )}
        </div>

        {/* Detail panels */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status breakdown */}
            <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" /> Status dos vídeos
              </h2>

              <Row
                label="✅ Concluídos"
                value={metrics.videos.completed}
                total={metrics.videos.total}
                color="bg-green-500"
              />
              <Row
                label="⚙️ Processando"
                value={metrics.videos.processing}
                total={metrics.videos.total}
                color="bg-cyan-500"
              />
              <Row
                label="❌ Com erro"
                value={metrics.videos.failed}
                total={metrics.videos.total}
                color="bg-red-500"
              />

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
                <p className="text-xs text-muted-foreground">
                  Áudios reutilizados para acelerar gerações repetidas
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Arquivos" value={metrics.voice_cache.files} />
                  <MiniStat label="Tamanho" value={`${metrics.voice_cache.size_mb} MB`} />
                </div>
              </div>

              <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-background p-6 shadow-lg space-y-3">
                <h2 className="text-lg font-semibold">⚡ Pipeline V2</h2>
                <div className="flex flex-col gap-2">
                  <Row
                    label="Total"
                    value={metrics.pipeline_v2.total}
                    total={Math.max(1, metrics.pipeline_v2.total)}
                    color="bg-primary"
                  />
                  <Row
                    label="Concluídos"
                    value={metrics.pipeline_v2.concluidos}
                    total={Math.max(1, metrics.pipeline_v2.total)}
                    color="bg-green-500"
                  />
                  <Row
                    label="Erros"
                    value={metrics.pipeline_v2.erro}
                    total={Math.max(1, metrics.pipeline_v2.total)}
                    color="bg-red-500"
                  />
                </div>
              </div>
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
        <span>{label}</span>
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
