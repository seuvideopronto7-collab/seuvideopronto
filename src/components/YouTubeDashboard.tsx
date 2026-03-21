import CopyField from "@/components/CopyField";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface YouTubeDashboardProps {
  data: {
    titulos?: string[];
    descricao_youtube?: string;
    tags_youtube?: string;
    palavras_chave?: string[];
    thumbnail_prompt?: string;
    seo_score?: number;
  } | null;
}

const YouTubeDashboard = ({ data }: YouTubeDashboardProps) => {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!data) return null;

  const copyAll = () => {
    const all = `TÍTULO: ${data.titulos?.[0] || ""}\n\nDESCRIÇÃO:\n${data.descricao_youtube || ""}\n\nTAGS: ${data.tags_youtube || ""}\n\nPALAVRAS-CHAVE: ${data.palavras_chave?.join(", ") || ""}`;
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    toast.success("Tudo copiado para YouTube!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          📺 Dashboard YouTube
        </h2>
        {data.seo_score && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">SEO Score</span>
            <span className="bg-neon-cyan/20 text-neon-cyan font-mono text-sm px-2 py-0.5 rounded-md font-bold">
              {data.seo_score}/100
            </span>
          </div>
        )}
      </div>

      {data.titulos && data.titulos.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground font-medium">📺 TÍTULOS (escolha o melhor)</span>
          {data.titulos.map((t, i) => (
            <CopyField key={i} label={`Título ${i + 1}`} emoji="" value={t} />
          ))}
        </div>
      )}

      {data.descricao_youtube && (
        <CopyField label="DESCRIÇÃO" emoji="📄" value={data.descricao_youtube} multiline />
      )}

      {data.tags_youtube && (
        <CopyField label="TAGS" emoji="🏷️" value={data.tags_youtube} />
      )}

      {data.palavras_chave && (
        <CopyField label="PALAVRAS-CHAVE" emoji="🔑" value={data.palavras_chave.join(", ")} />
      )}

      {data.thumbnail_prompt && (
        <CopyField label="THUMBNAIL (Prompt)" emoji="🖼️" value={data.thumbnail_prompt} multiline />
      )}

      <Button variant="viral" className="w-full" onClick={copyAll}>
        {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copiedAll ? "Copiado!" : "COPIAR TUDO"}
      </Button>
    </div>
  );
};

export default YouTubeDashboard;
