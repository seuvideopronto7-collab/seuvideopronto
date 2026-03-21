import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface StepAnaliseProps {
  analysisData: any;
  isLoading: boolean;
  onContinue: () => void;
}

const phases = [
  "Lendo conteúdo...",
  "Identificando contexto...",
  "Detectando estilo...",
  "Definindo melhor formato...",
];

const StepAnalise = ({ analysisData, isLoading, onContinue }: StepAnaliseProps) => {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    setCurrentPhase(0);
    const interval = setInterval(() => {
      setCurrentPhase((p) => (p < phases.length - 1 ? p + 1 : p));
    }, 1500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Analisando conteúdo...</h2>
        <div className="glass-card p-8 space-y-4 max-w-lg mx-auto">
          {phases.map((phase, i) => (
            <div key={i} className="flex items-center gap-3 transition-all duration-500">
              {i <= currentPhase ? (
                i < currentPhase ? (
                  <Check className="w-5 h-5 text-accent shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                )
              ) : (
                <div className="w-5 h-5 rounded-full border border-border/50 shrink-0" />
              )}
              <span className={`text-sm ${i <= currentPhase ? "text-foreground" : "text-muted-foreground/40"}`}>
                {phase}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analysisData) return null;

  const analise = analysisData.analise;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Análise Concluída</h2>
        <p className="text-sm text-muted-foreground">A IA identificou os seguintes padrões</p>
      </div>

      {analise && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analise.tema && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Tipo de Conteúdo</p>
              <p className="text-sm font-medium">{analise.tema}</p>
            </div>
          )}
          {analise.padrao_viral && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Objetivo Sugerido</p>
              <p className="text-sm font-medium">{analise.padrao_viral}</p>
            </div>
          )}
          {analise.emocao && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Tom Recomendado</p>
              <p className="text-sm font-medium">{analise.emocao}</p>
            </div>
          )}
          {analise.estilo && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Nicho Identificado</p>
              <p className="text-sm font-medium">{analise.estilo}</p>
            </div>
          )}
        </div>
      )}

      {analise?.pontos_fortes && (
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-2">Pontos Fortes Identificados</p>
          <div className="flex flex-wrap gap-2">
            {analise.pontos_fortes.map((p: string, i: number) => (
              <span key={i} className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs">{p}</span>
            ))}
          </div>
        </div>
      )}

      <Button variant="neon" size="lg" onClick={onContinue} className="w-full sm:w-auto">
        Continuar para Modo de Geração →
      </Button>
    </div>
  );
};

export default StepAnalise;
