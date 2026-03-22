import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Target } from "lucide-react";
import CopyField from "@/components/CopyField";

interface Props {
  data: any;
  isLoading: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
}

const InfoStepVSL = ({ data, isLoading, onRegenerate, onContinue }: Props) => {
  if (isLoading) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Criando seu VSL...</p>
        <p className="text-xs text-muted-foreground">Hook, storytelling, oferta e CTA</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">VSL — Vídeo de Vendas</h3>
            <p className="text-xs text-muted-foreground">Roteiro persuasivo gerado</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regerar
        </Button>
      </div>

      <CopyField label="Hook Inicial" emoji="🎣" value={data.hook || ""} />
      <CopyField label="Quebra de Padrão" emoji="💥" value={data.quebra_padrao || ""} />
      <CopyField label="Storytelling" emoji="📖" value={data.storytelling || ""} multiline />
      <CopyField label="Dor + Solução" emoji="💡" value={data.dor_solucao || ""} multiline />
      <CopyField label="Oferta" emoji="💰" value={data.oferta || ""} multiline />
      <CopyField label="CTA" emoji="🚀" value={data.cta || ""} />
      <CopyField label="Roteiro Completo" emoji="🎬" value={data.roteiro_completo || ""} multiline />

      <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
        🎨 GERAR KIT DE VENDAS
      </Button>
    </div>
  );
};

export default InfoStepVSL;
