import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, User, Heart, Zap } from "lucide-react";
import CopyField from "@/components/CopyField";

interface Props {
  data: any;
  isLoading: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
}

const InfoStepEstrutura = ({ data, isLoading, onRegenerate, onContinue }: Props) => {
  if (isLoading) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Gerando estrutura do infoproduto...</p>
        <p className="text-xs text-muted-foreground">A IA está criando nome, promessa, avatar e mecanismo único</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Estrutura Gerada</h3>
            <p className="text-xs text-muted-foreground">Revise e aprove</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regerar
        </Button>
      </div>

      <CopyField label="Nome Otimizado" emoji="🏷️" value={data.nome_otimizado || ""} />
      <CopyField label="Subtítulo" emoji="✨" value={data.subtitulo || ""} />
      <CopyField label="Promessa Forte" emoji="🎯" value={data.promessa_forte || ""} multiline />
      <CopyField label="Mecanismo Único" emoji="⚙️" value={data.mecanismo_unico || ""} multiline />

      {data.avatar && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Avatar do Cliente</span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-sm">
            <p><span className="text-muted-foreground">Perfil:</span> {data.avatar.perfil}</p>
            <p><span className="text-muted-foreground">Idade:</span> {data.avatar.idade}</p>
            <p><span className="text-muted-foreground">Situação:</span> {data.avatar.situacao}</p>
            <p><span className="text-muted-foreground">Frustração:</span> {data.avatar.frustracao}</p>
            <p><span className="text-muted-foreground">Desejo:</span> {data.avatar.desejo}</p>
          </div>
        </div>
      )}

      {data.dores && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold">Dores & Desejos</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Dores</p>
              {data.dores.map((d: string, i: number) => (
                <p key={i} className="text-sm">😣 {d}</p>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Desejos</p>
              {data.desejos?.map((d: string, i: number) => (
                <p key={i} className="text-sm">🌟 {d}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
        📚 GERAR CONTEÚDO COMPLETO
      </Button>
    </div>
  );
};

export default InfoStepEstrutura;
