import { cn } from "@/lib/utils";
import { Circle, ExternalLink } from "lucide-react";
import { Button } from "./button";

export type ApiStatus = "connected" | "disconnected" | "error" | "testing";

interface ApiStatusItemProps {
  name: string;
  description?: string;
  status: ApiStatus;
  onConnect?: () => void;
}

const statusConfig: Record<ApiStatus, { label: string; dotClass: string; bgClass: string; borderClass: string }> = {
  connected: {
    label: "Conectada",
    dotClass: "text-emerald-400",
    bgClass: "bg-emerald-500/5",
    borderClass: "border-emerald-500/20",
  },
  disconnected: {
    label: "Desconectada",
    dotClass: "text-red-400",
    bgClass: "bg-red-500/5",
    borderClass: "border-red-500/20",
  },
  error: {
    label: "Erro",
    dotClass: "text-red-400",
    bgClass: "bg-red-500/5",
    borderClass: "border-red-500/20",
  },
  testing: {
    label: "Testando...",
    dotClass: "text-amber-400 animate-pulse",
    bgClass: "bg-amber-500/5",
    borderClass: "border-amber-500/20",
  },
};

export function ApiStatusItem({ name, description, status, onConnect }: ApiStatusItemProps) {
  const cfg = statusConfig[status];

  return (
    <div className={cn(
      "rounded-xl border p-4 flex items-center justify-between transition-all duration-300",
      cfg.bgClass, cfg.borderClass
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Circle className={cn("w-2.5 h-2.5 fill-current shrink-0", cfg.dotClass)} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", cfg.borderClass, cfg.bgClass)}>
          {cfg.label}
        </span>
        {status === "disconnected" && onConnect && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={onConnect}>
            <ExternalLink className="w-3 h-3" /> Conectar
          </Button>
        )}
      </div>
    </div>
  );
}
