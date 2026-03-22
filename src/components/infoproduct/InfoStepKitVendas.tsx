import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Palette } from "lucide-react";
import CopyField from "@/components/CopyField";

interface Props {
  data: any;
  isLoading: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
}

const InfoStepKitVendas = ({ data, isLoading, onRegenerate, onContinue }: Props) => {
  if (isLoading) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Montando kit de vendas...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Kit de Vendas</h3>
            <p className="text-xs text-muted-foreground">Copy e estrutura de página</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regerar
        </Button>
      </div>

      <CopyField label="Headline" emoji="🏷️" value={data.headline || ""} />
      <CopyField label="Subheadline" emoji="✨" value={data.subheadline || ""} />

      {data.bullets && (
        <CopyField
          label="Bullet Points"
          emoji="✅"
          value={data.bullets.map((b: string) => `• ${b}`).join("\n")}
          multiline
        />
      )}

      <CopyField label="Garantia" emoji="🛡️" value={data.garantia || ""} multiline />
      <CopyField label="CTA Principal" emoji="🚀" value={data.cta_principal || ""} />

      {data.faq && data.faq.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-3">
          <p className="text-sm font-semibold">❓ FAQ</p>
          {data.faq.map((item: any, i: number) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-medium">{item.pergunta}</p>
              <p className="text-xs text-muted-foreground">{item.resposta}</p>
            </div>
          ))}
        </div>
      )}

      {data.landing_page && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/30 space-y-2">
          <p className="text-sm font-semibold">📄 Estrutura da Landing Page</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{data.landing_page.estrutura}</p>
          {data.landing_page.secoes?.map((s: string, i: number) => (
            <p key={i} className="text-sm">📌 {s}</p>
          ))}
        </div>
      )}

      <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
        🚀 FINALIZAR
      </Button>
    </div>
  );
};

export default InfoStepKitVendas;
