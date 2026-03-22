import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

export interface IdeiaData {
  nome: string;
  nicho: string;
  publico: string;
  problema: string;
  promessa: string;
}

interface Props {
  data: IdeiaData;
  onChange: (data: IdeiaData) => void;
  onContinue: () => void;
}

const InfoStepIdeia = ({ data, onChange, onContinue }: Props) => {
  const canContinue = data.nicho && data.publico && data.problema && data.promessa;

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Ideia do Produto</h3>
          <p className="text-xs text-muted-foreground">Defina a base do seu infoproduto</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nome do produto (opcional)</label>
          <Input
            placeholder="Ex: Método X para Y"
            value={data.nome}
            onChange={(e) => onChange({ ...data, nome: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nicho *</label>
          <Input
            placeholder="Ex: Marketing digital, fitness, finanças..."
            value={data.nicho}
            onChange={(e) => onChange({ ...data, nicho: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Público-alvo *</label>
          <Input
            placeholder="Ex: Iniciantes em renda extra, mães empreendedoras..."
            value={data.publico}
            onChange={(e) => onChange({ ...data, publico: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Problema que resolve *</label>
          <Textarea
            placeholder="Qual dor seu produto resolve?"
            value={data.problema}
            onChange={(e) => onChange({ ...data, problema: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Promessa principal *</label>
          <Textarea
            placeholder="Qual o resultado final que o aluno vai alcançar?"
            value={data.promessa}
            onChange={(e) => onChange({ ...data, promessa: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      <Button
        variant="viral"
        size="lg"
        className="w-full"
        disabled={!canContinue}
        onClick={onContinue}
      >
        🧠 GERAR ESTRUTURA
      </Button>
    </div>
  );
};

export default InfoStepIdeia;
