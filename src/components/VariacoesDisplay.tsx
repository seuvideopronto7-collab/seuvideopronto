interface VariacoesDisplayProps {
  data: {
    variacoes?: Array<{
      numero: number;
      hook: string;
      emocao: string;
      tendencia: string;
    }>;
  } | null;
}

import CopyField from "@/components/CopyField";

const VariacoesDisplay = ({ data }: VariacoesDisplayProps) => {
  if (!data?.variacoes) return null;

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        ⚡ 10 Variações de Hooks
      </h2>

      <div className="space-y-3">
        {data.variacoes.map((v, i) => (
          <div key={i} className="bg-muted/30 rounded-lg p-4 border border-border/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary/20 text-primary font-mono text-xs px-2 py-0.5 rounded-md font-bold">
                #{v.numero}
              </span>
              <span className="bg-neon-cyan/10 text-neon-cyan text-xs px-2 py-0.5 rounded-md">
                {v.emocao}
              </span>
              <span className="bg-neon-yellow/10 text-neon-yellow text-xs px-2 py-0.5 rounded-md">
                {v.tendencia}
              </span>
            </div>
            <CopyField label={`Hook ${v.numero}`} emoji="" value={v.hook} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VariacoesDisplay;
