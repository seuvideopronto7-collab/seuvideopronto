import { Button } from "@/components/ui/button";
import CopyField from "@/components/CopyField";
import { RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface StepSeoProps {
  data: any;
  onRegenerate: () => void;
  onContinue: () => void;
  isLoading: boolean;
}

const StepSeo = ({ data, onRegenerate, onContinue, isLoading }: StepSeoProps) => {
  const seo = data?.titulos ? data : data?.seo;
  const isFallback = Boolean(data?._fallback);
  const reason = data?._reason;

  const copyAll = () => {
    const text = [
      `TÍTULOS:\n${(seo.titulos || []).join("\n")}`,
      `\nDESCRIÇÃO YOUTUBE:\n${seo.descricao_youtube || ""}`,
      `\nHASHTAGS:\n${(seo.hashtags || []).join(" ")}`,
      `\nPALAVRAS-CHAVE:\n${(seo.palavras_chave || []).join(", ")}`,
      `\nTAGS:\n${seo.tags_youtube || seo.tags || ""}`,
      `\nTHUMBNAIL:\n${seo.thumbnail_prompt || ""}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("SEO copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">SEO Estratégico</h2>
          <p className="text-sm text-muted-foreground">Otimizado para máxima viralização</p>
        </div>
        <div className="flex gap-2">
          {seo && (
            <Button variant="glass" size="sm" onClick={copyAll}><Copy className="w-3 h-3" /> Copiar SEO</Button>
          )}
          <Button variant="glass" size="sm" onClick={onRegenerate} disabled={isLoading}><RefreshCw className="w-3 h-3" /> Regerar</Button>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        {isFallback && (
          <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
            <span>Fallback aplicado automaticamente</span>
            {reason && <span className="text-muted-foreground">{reason}</span>}
          </div>
        )}
        {seo ? (
          <>
            {seo.titulos && <CopyField label="Títulos" emoji="📺" value={seo.titulos.join("\n")} multiline />}
            {seo.descricao_youtube && <CopyField label="Descrição YouTube" emoji="📄" value={seo.descricao_youtube} multiline />}
            {seo.hashtags && <CopyField label="Hashtags" emoji="🔥" value={seo.hashtags.join(" ")} />}
            {(seo.palavras_chave || seo.tags) && (
              <CopyField label="Tags / Palavras-chave" emoji="🏷️" value={seo.palavras_chave?.join(", ") || seo.tags_youtube || seo.tags || ""} />
            )}
            {seo.thumbnail_prompt && <CopyField label="Ideia de Thumbnail" emoji="🖼️" value={seo.thumbnail_prompt} multiline />}
            {seo.seo_score && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm text-muted-foreground">SEO Score:</span>
                <span className="text-2xl font-bold text-accent">{seo.seo_score}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            SEO indisponível no momento. Você pode continuar sem travar o fluxo.
          </div>
        )}
      </div>

      <Button variant="neon" size="lg" onClick={onContinue} className="w-full sm:w-auto">
        Continuar para Variações →
      </Button>
    </div>
  );
};

export default StepSeo;
