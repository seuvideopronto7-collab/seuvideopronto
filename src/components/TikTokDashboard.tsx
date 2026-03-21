import CopyField from "@/components/CopyField";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TikTokDashboardProps {
  data: {
    descricao_tiktok?: string;
    hashtags?: string[];
    hook?: string;
  } | null;
  roteiro?: {
    hook?: string;
  } | null;
}

const TikTokDashboard = ({ data, roteiro }: TikTokDashboardProps) => {
  const [copiedAll, setCopiedAll] = useState(false);

  if (!data) return null;

  const hook = roteiro?.hook || data.hook || "";
  
  const copyAll = () => {
    const all = `LEGENDA:\n${data.descricao_tiktok || ""}\n\nHASHTAGS: ${data.hashtags?.join(" ") || ""}\n\nHOOK: ${hook}`;
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    toast.success("Tudo copiado para TikTok!");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        📱 Dashboard TikTok
      </h2>

      {hook && <CopyField label="HOOK" emoji="🎯" value={hook} />}

      {data.descricao_tiktok && (
        <CopyField label="LEGENDA" emoji="📱" value={data.descricao_tiktok} multiline />
      )}

      {data.hashtags && (
        <CopyField label="HASHTAGS" emoji="🔥" value={data.hashtags.join(" ")} />
      )}

      <Button variant="viral" className="w-full" onClick={copyAll}>
        {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copiedAll ? "Copiado!" : "COPIAR TUDO"}
      </Button>
    </div>
  );
};

export default TikTokDashboard;
