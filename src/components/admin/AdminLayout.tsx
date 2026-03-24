import { ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Film, Gauge, LayoutGrid, Menu, Settings, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type AdminLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

const AdminLayout = ({ title, description, children, actionLabel, onAction }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const menu = useMemo(
    () => [
      { label: "Visão Geral", path: "/admin/overview", icon: LayoutGrid },
      { label: "Geração de Vídeo", path: "/admin/video-generator", icon: Film },
      { label: "Renderizações", path: "/admin/renders", icon: Gauge },
      { label: "Roteiros", path: "/admin/scripts", icon: ShieldCheck },
      { label: "Vozes / Narração", path: "/admin/voices", icon: Users },
      { label: "Trilhas Sonoras", path: "/admin/soundtracks", icon: Film },
      { label: "Integrações API", path: "/admin/integrations", icon: Settings },
      { label: "Publicação Social", path: "/admin/social-publishing", icon: Bell },
      { label: "Analytics", path: "/admin/analytics", icon: Gauge },
      { label: "Usuários", path: "/admin/users", icon: Users },
      { label: "Planos", path: "/admin/plans", icon: LayoutGrid },
      { label: "Logs do Sistema", path: "/admin/logs", icon: ShieldCheck },
      { label: "Configurações", path: "/admin/settings", icon: Settings },
    ],
    [],
  );

  const sidebar = (
    <div className="h-full bg-card/70 border-r border-border/50 px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5c451] to-[#3b82f6] flex items-center justify-center text-sm font-bold text-black">
          PDG
        </div>
        <div>
          <p className="text-sm font-semibold">Admin Studio</p>
            <p className="text-[11px] text-muted-foreground">Modo cinema ativo</p>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-140px)] pr-2">
        <div className="space-y-1">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              activeClassName="bg-muted/50 text-foreground border border-border/40"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
        Status do sistema
        <div className="mt-2 flex items-center gap-2">
          <span className="status-pill status-online">ONLINE</span>
          <span>Motor real pronto</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block min-h-screen sticky top-0">{sidebar}</aside>
        <div>
          <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur">
            <div className="px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    {sidebar}
                  </SheetContent>
                </Sheet>
                <div>
                  <h1 className="text-lg font-semibold">{title}</h1>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="hidden md:flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3">
                  <Input
                    placeholder="Buscar na plataforma"
                    className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="status-pill status-online">ONLINE</div>
                <Button variant="ghost" size="icon" onClick={() => toast.message("Nenhuma notificação pendente.") }>
                  <Bell className="h-4 w-4" />
                </Button>
                <Button
                  variant="neon"
                  className="hidden sm:inline-flex"
                  onClick={onAction || (() => navigate("/admin/video-generator"))}
                >
                  {actionLabel || "Gerar vídeo cinematográfico"}
                </Button>
                <Avatar className="h-9 w-9 border border-border/40">
                  <AvatarFallback className="bg-muted/40 text-xs">
                    {profile?.full_name?.slice(0, 2).toUpperCase() || "AD"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="px-4 lg:px-8 py-6 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
