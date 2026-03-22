import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  estruturaData: any;
  conteudoData: any;
  vslData: any;
  kitData: any;
  onNewProduct: () => void;
}

const InfoStepEntrega = ({ estruturaData, conteudoData, vslData, kitData, onNewProduct }: Props) => {
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const buildFullCopy = (platform: string) => {
    const parts = [];
    if (estruturaData) {
      parts.push(`NOME: ${estruturaData.nome_otimizado}`);
      parts.push(`SUBTÍTULO: ${estruturaData.subtitulo}`);
      parts.push(`PROMESSA: ${estruturaData.promessa_forte}`);
      parts.push("");
    }
    if (kitData) {
      parts.push(`HEADLINE: ${kitData.headline}`);
      parts.push(`SUBHEADLINE: ${kitData.subheadline}`);
      parts.push("");
      if (kitData.bullets) {
        parts.push("BULLET POINTS:");
        kitData.bullets.forEach((b: string) => parts.push(`• ${b}`));
        parts.push("");
      }
      parts.push(`GARANTIA: ${kitData.garantia}`);
      parts.push(`CTA: ${kitData.cta_principal}`);
    }
    if (conteudoData?.modulos) {
      parts.push("");
      parts.push("ESTRUTURA DO CURSO:");
      conteudoData.modulos.forEach((m: any) => {
        parts.push(`\nMÓDULO ${m.numero}: ${m.titulo}`);
        m.aulas?.forEach((a: any) => parts.push(`  Aula ${a.numero}: ${a.titulo}`));
      });
    }
    return parts.join("\n");
  };

  const handleCopyPlatform = (platform: string) => {
    navigator.clipboard.writeText(buildFullCopy(platform));
    setCopiedPlatform(platform);
    toast.success(`Copiado para ${platform}!`);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Seu Infoproduto Está Pronto! 🎉</h3>
          <p className="text-xs text-muted-foreground">Copie tudo para sua plataforma</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-2">
        <p className="text-sm font-semibold">📦 Resumo do Produto</p>
        {estruturaData && (
          <>
            <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {estruturaData.nome_otimizado}</p>
            <p className="text-sm"><span className="text-muted-foreground">Promessa:</span> {estruturaData.promessa_forte}</p>
          </>
        )}
        {conteudoData?.modulos && (
          <p className="text-sm"><span className="text-muted-foreground">Módulos:</span> {conteudoData.modulos.length} módulos</p>
        )}
        <div className="flex gap-2 mt-2 flex-wrap">
          {estruturaData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Estrutura</span>}
          {conteudoData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Conteúdo</span>}
          {vslData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ VSL</span>}
          {kitData && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ Kit Vendas</span>}
        </div>
      </div>

      {/* Plataformas */}
      <div className="space-y-3">
        {["Hotmart", "Eduzz", "Monetizze"].map((p) => (
          <Button
            key={p}
            variant="glass"
            size="lg"
            className="w-full justify-between"
            onClick={() => handleCopyPlatform(p)}
          >
            <span>📋 COPIAR PARA {p.toUpperCase()}</span>
            {copiedPlatform === p ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
          </Button>
        ))}
      </div>

      <Button variant="viral" size="lg" className="w-full" onClick={onNewProduct}>
        ✨ CRIAR NOVO INFOPRODUTO
      </Button>
    </div>
  );
};

export default InfoStepEntrega;
