import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface CopyFieldProps {
  label: string;
  emoji?: string;
  value: string;
  multiline?: boolean;
}

const CopyField = ({ label, emoji, value, multiline }: CopyFieldProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {emoji} {label}
        </span>
        <Button variant="copy" size="sm" onClick={handleCopy} className="h-7 px-2">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      {multiline ? (
        <pre className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap font-mono text-foreground/90 border border-border/30 max-h-40 overflow-y-auto">
          {value}
        </pre>
      ) : (
        <div className="bg-muted/50 rounded-lg p-3 text-sm font-mono text-foreground/90 border border-border/30">
          {value}
        </div>
      )}
    </div>
  );
};

export default CopyField;
