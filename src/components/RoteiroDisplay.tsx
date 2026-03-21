interface RoteiroDisplayProps {
  data: {
    angulos_virais?: string[];
    roteiro?: {
      hook?: string;
      curiosidade?: string;
      conexao_tendencia?: string;
      insercao_produto?: string;
      prova?: string;
      cta?: string;
    };
    roteiro_completo?: string;
  } | null;
}

import CopyField from "@/components/CopyField";

const RoteiroDisplay = ({ data }: RoteiroDisplayProps) => {
  if (!data) return null;

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        🎬 Roteiro Viral
      </h2>

      {data.angulos_virais && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground font-medium">🎯 Ângulos Virais</span>
          <div className="flex flex-wrap gap-2">
            {data.angulos_virais.map((a, i) => (
              <span key={i} className="bg-primary/10 text-primary border border-primary/20 text-xs px-3 py-1.5 rounded-full">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.roteiro && (
        <div className="space-y-3">
          {data.roteiro.hook && <CopyField label="HOOK (0-3s)" emoji="⚡" value={data.roteiro.hook} />}
          {data.roteiro.curiosidade && <CopyField label="CURIOSIDADE" emoji="🤔" value={data.roteiro.curiosidade} />}
          {data.roteiro.conexao_tendencia && <CopyField label="TENDÊNCIA" emoji="📈" value={data.roteiro.conexao_tendencia} />}
          {data.roteiro.insercao_produto && <CopyField label="PRODUTO" emoji="🎯" value={data.roteiro.insercao_produto} />}
          {data.roteiro.prova && <CopyField label="PROVA" emoji="✅" value={data.roteiro.prova} />}
          {data.roteiro.cta && <CopyField label="CTA" emoji="🔥" value={data.roteiro.cta} />}
        </div>
      )}

      {data.roteiro_completo && (
        <CopyField label="ROTEIRO COMPLETO" emoji="📝" value={data.roteiro_completo} multiline />
      )}
    </div>
  );
};

export default RoteiroDisplay;
