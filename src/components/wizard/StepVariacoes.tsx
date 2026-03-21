import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface StepVariacoesProps {
  variacoesData: any;
  variacoesCount: number | null;
  onSelectCount: (count: number) => void;
  onGenerate: () => void;
  onContinue: () => void;
  isLoading: boolean;
}

const StepVariacoes = ({ variacoesData, variacoesCount, onSelectCount, onGenerate, onContinue, isLoading }: StepVariacoesProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Variações</h2>
        <p className="text-sm text-muted-foreground">Gere múltiplas versões do seu conteúdo</p>
      </div>

      {!variacoesData && (
        <>
          <div className="flex gap-3">
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => onSelectCount(n)}
                className={`
                  glass-card px-6 py-4 text-center transition-all hover:scale-105
                  ${variacoesCount === n ? "ring-2 ring-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]" : ""}
                `}
              >
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-xs text-muted-foreground">variações</p>
              </button>
            ))}
          </div>

          <Button variant="viral" size="lg" disabled={!variacoesCount || isLoading} onClick={onGenerate}>
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : `Gerar ${variacoesCount || ""} Variações`}
          </Button>
        </>
      )}

      {variacoesData?.variacoes && (
        <div className="space-y-3">
          {variacoesData.variacoes.map((v: any, i: number) => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary">VARIAÇÃO {v.numero || i + 1}</span>
                <div className="flex gap-2">
                  {v.emocao && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{v.emocao}</span>}
                  {v.tendencia && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{v.tendencia}</span>}
                </div>
              </div>
              <p className="text-sm">{v.hook}</p>
            </div>
          ))}
        </div>
      )}

      {(variacoesData || !variacoesCount) && (
        <Button variant="neon" size="lg" onClick={onContinue} className="w-full sm:w-auto">
          Continuar para Montagem →
        </Button>
      )}
    </div>
  );
};

export default StepVariacoes;
