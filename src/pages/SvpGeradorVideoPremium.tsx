import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  BarChart3,
  PenTool,
  Search,
  Film,
  Send,
  Check,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

type StepStatus = "pendente" | "em_andamento" | "concluido";

interface PipelineStep {
  id: number;
  label: string;
  icon: React.ElementType;
  description: string;
}

const STEPS: PipelineStep[] = [
  { id: 1, label: "Entrada", icon: Upload, description: "Upload de imagem ou briefing do produto" },
  { id: 2, label: "Conteúdo", icon: FileText, description: "Dados do produto, nicho e público-alvo" },
  { id: 3, label: "Análise", icon: BarChart3, description: "IA analisa o conteúdo e identifica padrões" },
  { id: 4, label: "Roteiro", icon: PenTool, description: "Roteiro cinematográfico com gancho e CTA" },
  { id: 5, label: "SEO", icon: Search, description: "Títulos, hashtags e descrições otimizadas" },
  { id: 6, label: "Montagem", icon: Film, description: "Render do vídeo com narração e trilha" },
  { id: 7, label: "Publicação", icon: Send, description: "Publicar em TikTok, Reels e Shorts" },
];

export default function SvpGeradorVideoPremium() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [etapasConcluidas, setEtapasConcluidas] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const userId = auth?.user?.id;

  // Load or create pipeline
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("video_pipeline" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Pipeline load error:", error);
        setLoading(false);
        return;
      }

      if (data) {
        const d = data as any;
        setPipelineId(d.id);
        setEtapaAtual(d.etapa_atual || 1);
        setEtapasConcluidas(d.etapas_concluidas || []);
      } else {
        // Create new pipeline
        const { data: newData, error: insertError } = await supabase
          .from("video_pipeline" as any)
          .insert({ user_id: userId, etapa_atual: 1, etapas_concluidas: [], status: "em_andamento" } as any)
          .select()
          .single();
        if (!insertError && newData) {
          setPipelineId((newData as any).id);
        }
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const savePipeline = useCallback(
    async (nextEtapa: number, nextConcluidas: number[]) => {
      if (!pipelineId) return;
      setSaving(true);
      const allDone = nextConcluidas.length >= 7;
      await supabase
        .from("video_pipeline" as any)
        .update({
          etapa_atual: nextEtapa,
          etapas_concluidas: nextConcluidas,
          status: allDone ? "concluido" : "em_andamento",
        } as any)
        .eq("id", pipelineId);
      setSaving(false);
    },
    [pipelineId],
  );

  const getStepStatus = (stepId: number): StepStatus => {
    if (etapasConcluidas.includes(stepId)) return "concluido";
    if (stepId === etapaAtual) return "em_andamento";
    return "pendente";
  };

  const handleStepClick = (stepId: number) => {
    setActiveStep(activeStep === stepId ? null : stepId);
  };

  const completeStep = async (stepId: number) => {
    const newConcluidas = etapasConcluidas.includes(stepId)
      ? etapasConcluidas
      : [...etapasConcluidas, stepId].sort((a, b) => a - b);

    const nextStep = Math.min(stepId + 1, 7);
    setEtapasConcluidas(newConcluidas);
    setEtapaAtual(nextStep);
    setActiveStep(null);
    await savePipeline(nextStep, newConcluidas);
    toast.success(`Etapa "${STEPS[stepId - 1].label}" concluída!`);
  };

  const resetStep = async (stepId: number) => {
    const newConcluidas = etapasConcluidas.filter((s) => s !== stepId);
    setEtapasConcluidas(newConcluidas);
    if (etapaAtual > stepId) {
      setEtapaAtual(stepId);
      await savePipeline(stepId, newConcluidas);
    } else {
      await savePipeline(etapaAtual, newConcluidas);
    }
    toast.info(`Etapa "${STEPS[stepId - 1].label}" reaberta.`);
  };

  const progressPercent = Math.round((etapasConcluidas.length / 7) * 100);
  const allDone = etapasConcluidas.length >= 7;

  const handleMainAction = () => {
    if (allDone) {
      toast.success("Pipeline concluído! Publicando...");
    } else {
      // Navigate to the current step
      const nextIncomplete = STEPS.find((s) => !etapasConcluidas.includes(s.id));
      if (nextIncomplete) {
        setActiveStep(nextIncomplete.id);
        setEtapaAtual(nextIncomplete.id);
      }
    }
  };

  if (!auth || auth.loading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HEADER */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[900px] mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg p-2 hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-foreground tracking-tight truncate">
              Pipeline de Criação
            </h1>
            <p className="text-sm text-muted-foreground">
              Sistema guiado de produção de vídeo
            </p>
          </div>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Salvando...
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 pt-6 space-y-6">
        {/* STATUS + PROGRESS */}
        <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Status do Pipeline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {etapasConcluidas.length}/{STEPS.length} etapas concluídas
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </section>

        {/* INTERACTIVE STEPS */}
        <section className="space-y-3">
          {STEPS.map((step) => {
            const status = getStepStatus(step.id);
            const isActive = activeStep === step.id;
            const Icon = step.icon;

            return (
              <div key={step.id} className="space-y-0">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    isActive
                      ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.3)]"
                      : status === "concluido"
                        ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
                        : status === "em_andamento"
                          ? "border-primary/30 bg-card/60 hover:border-primary/50"
                          : "border-border/30 bg-card/30 hover:border-border/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        status === "concluido"
                          ? "bg-green-500/15 text-green-500"
                          : status === "em_andamento"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {status === "concluido" ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {step.id}/7
                        </span>
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {step.label}
                        </h3>
                        {status === "concluido" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                            concluído
                          </span>
                        )}
                        {status === "em_andamento" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            atual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.description}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isActive ? "rotate-90" : ""}`}
                    />
                  </div>
                </button>

                {/* Expanded action panel */}
                {isActive && (
                  <div className="mx-4 mt-0 rounded-b-2xl border border-t-0 border-border/30 bg-card/40 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {status === "concluido" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetStep(step.id)}
                          className="w-full sm:w-auto"
                        >
                          Reabrir etapa
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => completeStep(step.id)}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Marcar como concluída
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate("/");
                          // Could navigate to specific tool based on step
                        }}
                        className="w-full sm:w-auto"
                      >
                        Abrir ferramenta
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      {/* FIXED BOTTOM CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-[900px] mx-auto px-4 py-3">
          <Button
            onClick={handleMainAction}
            className={`w-full py-6 text-base font-bold rounded-xl transition-all ${
              allDone
                ? "bg-green-600 hover:bg-green-700 text-white shadow-[0_0_30px_-8px_rgba(34,197,94,0.5)]"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--primary)/0.4)]"
            }`}
          >
            {allDone ? "🚀 Publicar Vídeo" : "▶️ Continuar Produção"}
          </Button>
        </div>
      </div>
    </div>
  );
}
