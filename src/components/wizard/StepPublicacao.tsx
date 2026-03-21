import { useState } from "react";
import { Button } from "@/components/ui/button";
import CopyField from "@/components/CopyField";
import { toast } from "sonner";
import { Copy, Youtube } from "lucide-react";

interface StepPublicacaoProps {
  roteiroData: any;
  seoData: any;
}

const StepPublicacao = ({ roteiroData, seoData }: StepPublicacaoProps) => {
  const [tab, setTab] = useState<"youtube" | "tiktok">("youtube");
  const roteiro = roteiroData?.roteiro || roteiroData?.novo_roteiro;
  const seo = seoData?.titulos ? seoData : seoData?.seo;

  const copyYoutube = () => {
    const parts = [];
    if (seo?.titulos?.[0]) parts.push(`TÍTULO: ${seo.titulos[0]}`);
    if (seo?.descricao_youtube) parts.push(`DESCRIÇÃO:\n${seo.descricao_youtube}`);
    if (seo?.tags_youtube || seo?.tags) parts.push(`TAGS: ${seo.tags_youtube || seo.tags}`);
    if (seo?.thumbnail_prompt) parts.push(`THUMBNAIL: ${seo.thumbnail_prompt}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Copiado para YouTube!");
  };

  const copyTiktok = () => {
    const parts = [];
    if (seo?.descricao_tiktok) parts.push(`LEGENDA: ${seo.descricao_tiktok}`);
    if (seo?.hashtags) parts.push(`HASHTAGS: ${seo.hashtags.join(" ")}`);
    if (roteiro?.hook) parts.push(`HOOK: ${roteiro.hook}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast.success("Copiado para TikTok!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">📢 Publicação</h2>
        <p className="text-sm text-muted-foreground">Material pronto para publicar</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === "youtube" ? "neon" : "glass"}
          onClick={() => setTab("youtube")}
          className="gap-2"
        >
          <Youtube className="w-4 h-4" /> YouTube
        </Button>
        <Button
          variant={tab === "tiktok" ? "neon" : "glass"}
          onClick={() => setTab("tiktok")}
          className="gap-2"
        >
          📱 TikTok
        </Button>
      </div>

      {tab === "youtube" && (
        <div className="glass-card p-5 space-y-3 animate-fade-in">
          {seo?.titulos?.[0] && <CopyField label="Título" emoji="📺" value={seo.titulos[0]} />}
          {seo?.descricao_youtube && <CopyField label="Descrição" emoji="📄" value={seo.descricao_youtube} multiline />}
          {(seo?.tags_youtube || seo?.tags) && <CopyField label="Tags" emoji="🏷️" value={seo.tags_youtube || seo.tags} />}
          {seo?.palavras_chave && <CopyField label="Palavras-chave" emoji="🔑" value={seo.palavras_chave.join(", ")} />}
          {seo?.thumbnail_prompt && <CopyField label="Thumbnail" emoji="🖼️" value={seo.thumbnail_prompt} multiline />}
          {seo?.seo_score && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">📊 SEO Score:</span>
              <span className="text-xl font-bold text-accent">{seo.seo_score}/100</span>
            </div>
          )}
          <Button variant="neon" onClick={copyYoutube} className="w-full"><Copy className="w-4 h-4" /> Copiar Tudo para YouTube</Button>
        </div>
      )}

      {tab === "tiktok" && (
        <div className="glass-card p-5 space-y-3 animate-fade-in">
          {seo?.descricao_tiktok && <CopyField label="Legenda" emoji="📱" value={seo.descricao_tiktok} multiline />}
          {seo?.hashtags && <CopyField label="Hashtags" emoji="🔥" value={seo.hashtags.join(" ")} />}
          {roteiro?.hook && <CopyField label="Hook" emoji="🎯" value={roteiro.hook} />}
          <Button variant="neon" onClick={copyTiktok} className="w-full"><Copy className="w-4 h-4" /> Copiar Tudo para TikTok</Button>
        </div>
      )}

      <div className="glass-card p-6 text-center space-y-2">
        <p className="text-2xl">🎉</p>
        <p className="font-semibold">Material completo gerado!</p>
        <p className="text-sm text-muted-foreground">Publique seu vídeo e acompanhe os resultados</p>
      </div>
    </div>
  );
};

export default StepPublicacao;
