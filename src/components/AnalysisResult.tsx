import CopyField from "@/components/CopyField";
import { Badge } from "@/components/ui/badge";
import { Eye, Lightbulb, Film, PenLine, ArrowUpRight } from "lucide-react";

interface AnalysisResultProps {
  data: any;
}

const AnalysisResult = ({ data }: AnalysisResultProps) => {
  if (!data) return null;

  const { analise, novo_roteiro, novas_cenas, nova_copy, seo, melhorias } = data;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Analysis */}
      {analise && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-neon-cyan" />
            <h3 className="font-semibold">Análise do Conteúdo</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analise.tema && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Tema</p>
                <p className="text-sm font-medium">{analise.tema}</p>
              </div>
            )}
            {analise.estilo && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Estilo</p>
                <p className="text-sm font-medium">{analise.estilo}</p>
              </div>
            )}
            {analise.emocao && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Emoção</p>
                <p className="text-sm font-medium">{analise.emocao}</p>
              </div>
            )}
            {analise.padrao_viral && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Padrão Viral</p>
                <p className="text-sm font-medium">{analise.padrao_viral}</p>
              </div>
            )}
          </div>
          {analise.pontos_fortes && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Pontos Fortes</p>
              <div className="flex flex-wrap gap-2">
                {analise.pontos_fortes.map((p: string, i: number) => (
                  <Badge key={i} variant="secondary" className="bg-accent/10 text-accent border-accent/20">{p}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Script */}
      {novo_roteiro && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-neon-pink" />
            <h3 className="font-semibold">Novo Roteiro</h3>
          </div>
          <CopyField label="🎯 Hook (0-3s)" value={novo_roteiro.hook} />
          <CopyField label="📖 Abertura" value={novo_roteiro.abertura} />
          <CopyField label="📝 Desenvolvimento" value={novo_roteiro.desenvolvimento} />
          <CopyField label="🏆 Prova" value={novo_roteiro.prova} />
          <CopyField label="🚀 CTA" value={novo_roteiro.cta} />
          {novo_roteiro.roteiro_completo && (
            <CopyField label="📜 Roteiro Completo" value={novo_roteiro.roteiro_completo} />
          )}
        </div>
      )}

      {/* New Scenes */}
      {novas_cenas && novas_cenas.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-neon-yellow" />
            <h3 className="font-semibold">Novas Cenas</h3>
          </div>
          <div className="space-y-2">
            {novas_cenas.map((cena: any, i: number) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary">CENA {cena.cena || i + 1}</span>
                  <span className="text-xs text-muted-foreground">{cena.duracao}</span>
                </div>
                <p className="text-sm">{cena.descricao}</p>
                {cena.texto_tela && (
                  <p className="text-xs text-accent font-mono">📝 {cena.texto_tela}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Copy */}
      {nova_copy && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-neon-cyan" />
            <h3 className="font-semibold">Nova Copy</h3>
          </div>
          <CopyField label="🔥 Headline" value={nova_copy.headline} />
          <CopyField label="✨ Subheadline" value={nova_copy.subheadline} />
          {nova_copy.bullet_points && (
            <CopyField label="📌 Bullet Points" value={nova_copy.bullet_points.join("\n• ")} />
          )}
          <CopyField label="🚀 CTA" value={nova_copy.cta_texto} />
        </div>
      )}

      {/* Improvements */}
      {melhorias && melhorias.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Melhorias vs Original</h3>
          </div>
          <div className="space-y-2">
            {melhorias.map((m: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-accent mt-0.5">✓</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResult;
