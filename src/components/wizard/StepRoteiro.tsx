import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CopyField from "@/components/CopyField";
import { Copy, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";

interface StepRoteiroProps {
  data: any;
  onRegenerate: () => void;
  onContinue: () => void;
  isLoading: boolean;
}

const StepRoteiro = ({ data, onRegenerate, onContinue, isLoading }: StepRoteiroProps) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  if (!data) return null;

  const roteiro = data.roteiro || data.novo_roteiro;
  const fullScript = roteiro?.roteiro_completo || "";

  const handleEdit = () => {
    setEditText(fullScript);
    setEditing(true);
  };

  const copyAll = () => {
    const text = [
      `HOOK: ${roteiro?.hook}`,
      `DOR: ${roteiro?.dor || ""}`,
      `IDENTIFICACAO: ${roteiro?.identificacao || ""}`,
      `QUEBRA DE CRENCA: ${roteiro?.quebra_crenca || ""}`,
      `SOLUCAO: ${roteiro?.solucao || ""}`,
      `CURIOSIDADE: ${roteiro?.curiosidade || roteiro?.abertura || ""}`,
      `DESENVOLVIMENTO: ${roteiro?.conexao_tendencia || roteiro?.desenvolvimento || ""}`,
      `PRODUTO: ${roteiro?.insercao_produto || ""}`,
      `PROVA: ${roteiro?.prova}`,
      `CTA: ${roteiro?.cta}`,
      `\nROTEIRO COMPLETO:\n${fullScript}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Roteiro copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Roteiro Gerado</h2>
          <p className="text-sm text-muted-foreground">Revise e ajuste seu roteiro viral</p>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" size="sm" onClick={copyAll}><Copy className="w-3 h-3" /> Copiar</Button>
          <Button variant="glass" size="sm" onClick={onRegenerate} disabled={isLoading}><RefreshCw className="w-3 h-3" /> Regenerar</Button>
          <Button variant="glass" size="sm" onClick={handleEdit}><Pencil className="w-3 h-3" /> Editar</Button>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        {roteiro?.hook && <CopyField label="Hook (0-3s)" emoji="🎯" value={roteiro.hook} />}
        {roteiro?.dor && <CopyField label="Dor" emoji="⚡" value={roteiro.dor} />}
        {roteiro?.identificacao && <CopyField label="Identificacao" emoji="🧩" value={roteiro.identificacao} />}
        {roteiro?.quebra_crenca && <CopyField label="Quebra de crenca" emoji="💥" value={roteiro.quebra_crenca} />}
        {roteiro?.solucao && <CopyField label="Solucao" emoji="✅" value={roteiro.solucao} />}
        {(roteiro?.curiosidade || roteiro?.abertura) && (
          <CopyField label="Curiosidade / Abertura" emoji="❓" value={roteiro.curiosidade || roteiro.abertura} />
        )}
        {(roteiro?.conexao_tendencia || roteiro?.desenvolvimento) && (
          <CopyField label="Desenvolvimento" emoji="🔗" value={roteiro.conexao_tendencia || roteiro.desenvolvimento} />
        )}
        {roteiro?.insercao_produto && <CopyField label="Inserção do Produto" emoji="📦" value={roteiro.insercao_produto} />}
        {roteiro?.prova && <CopyField label="Prova Social" emoji="🏆" value={roteiro.prova} />}
        {roteiro?.cta && <CopyField label="CTA" emoji="🚀" value={roteiro.cta} />}
      </div>

      {editing ? (
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-medium">Editar Roteiro Completo</p>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={8}
            className="bg-muted/50 border-border/50 font-mono text-sm"
          />
          <Button variant="glass" size="sm" onClick={() => setEditing(false)}>Fechar Editor</Button>
        </div>
      ) : fullScript ? (
        <CopyField label="Roteiro Completo" emoji="📜" value={fullScript} multiline />
      ) : null}

      <Button variant="neon" size="lg" onClick={onContinue} className="w-full sm:w-auto">
        Continuar para SEO →
      </Button>
    </div>
  );
};

export default StepRoteiro;
