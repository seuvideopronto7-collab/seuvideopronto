import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: string;
  className?: string;
}

export function StatusCard({ title, value, icon: Icon, gradient = "from-primary to-primary/60", className }: StatusCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border/20 bg-gradient-to-br from-card to-background p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] flex items-center gap-4",
      className
    )}>
      <div className={cn("h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0", gradient)}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
