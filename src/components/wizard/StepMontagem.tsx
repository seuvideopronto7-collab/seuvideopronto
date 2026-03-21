import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";

interface StepMontagemProps {
  onContinue: () => void;
}

const stages = [
  "Roteiro aprovado",
  "SEO gerado",
  "Cenas definidas",
  "Montagem em andamento",
  "Renderização",
  "Finalização",
];

const StepMontagem = ({ onContinue }: StepMontagemProps) => {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((p) => {
        if (p >= stages.length - 1) {
          clearInterval(timer);
          setTimeout(() => setDone(true), 500);
          return p;
        }
        return p + 1;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.round(((current + 1) / stages.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Montagem do Vídeo</h2>
        <p className="text-sm text-muted-foreground">
          {done ? "Seu vídeo foi finalizado!" : "Seu vídeo está sendo finalizado..."}
        </p>
      </div>

      <div className="glass-card p-6 space-y-6 max-w-lg mx-auto">
        <Progress value={progress} className="h-2" />
        <p className="text-center text-sm font-mono text-primary">{progress}%</p>

        <div className="space-y-3">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-3 transition-all duration-500">
              {i <= current ? (
                i < current ? (
                  <Check className="w-5 h-5 text-accent shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                )
              ) : (
                <div className="w-5 h-5 rounded-full border border-border/50 shrink-0" />
              )}
              <span className={`text-sm ${i <= current ? "text-foreground" : "text-muted-foreground/40"}`}>
                {stage}
              </span>
            </div>
          ))}
        </div>
      </div>

      {done && (
        <Button variant="neon" size="lg" onClick={onContinue} className="w-full sm:w-auto animate-fade-in">
          Ver Resultado Final →
        </Button>
      )}
    </div>
  );
};

export default StepMontagem;
