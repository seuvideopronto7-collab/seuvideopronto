import { ReactNode, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Film, Menu, Settings, ShieldCheck, Users,
  LayoutGrid, Share2, LogOut, X, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AdminLiveLayer from "@/components/admin/AdminLiveLayer";
import logoSvp from "@/assets/logo-svp.png";

type AdminLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

const menuGroups = [
  {
    label: "Principal",
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutGrid },
      { label: "Gerador de Vídeo", path: "/admin/video-generator", icon: Film },
    ],
  },
  {
    label: "Operação",
    items: [
      { label: "Distribuição", path: "/admin/distribution", icon: Share2 },
      { label: "Usuários", path: "/admin/users", icon: Users },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "APIs", path: "/admin/apis", icon: Settings },
      { label: "Logs", path: "/admin/logs", icon: ShieldCheck },
      { label: "Configurações", path: "/admin/settings", icon: Settings },
    ],
  },
];

const AdminLayout = ({ title, description, children, actionLabel, onAction }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const displayName = profile?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  const sidebar = (onClose?: () => void) => (
    <div className="flex flex-col h-full w-[320px] bg-gradient-to-b from-[hsl(var(--sidebar-background))] to-[hsl(222_47%_8%)] border-r border-white/10 px-4 py-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0">
            SVP
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">Admin Studio</p>
            <p className="text-[11px] text-muted-foreground">Modo cinema ativo</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-sidebar-foreground transition-all duration-200"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── User card ── */}
      <button
        onClick={() => { navigate("/dashboard"); onClose?.(); }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-6 hover:bg-white/5 transition-all duration-200 group"
      >
        <Avatar className="h-9 w-9 border border-white/10">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-xs text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-left min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">Ver perfil</p>
        </div>
      </button>

      {/* ── Menu groups ── */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <nav className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose?.()}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/60 transition-all duration-200 hover:text-sidebar-foreground hover:bg-white/5 hover:scale-[1.02]"
                    activeClassName="bg-white/10 text-sidebar-foreground shadow-inner font-medium"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Footer ── */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <CircleDot className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>Sistema online</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-[320px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block min-h-screen sticky top-0">
          {sidebar()}
        </aside>

        <div>
          <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur">
            <div className="px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile trigger */}
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[320px] border-0">
                    {sidebar(() => setOpen(false))}
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
                <Button variant="ghost" size="icon" onClick={() => toast.message("Nenhuma notificação pendente.")}>
                  <Bell className="h-4 w-4" />
                </Button>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-foreground">
                  <span>{displayName}</span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                    ADMIN
                  </span>
                </div>
                <Button
                  variant="neon"
                  className="hidden sm:inline-flex"
                  onClick={onAction || (() => navigate("/admin/video-generator"))}
                >
                  {actionLabel || "Gerar vídeo"}
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="px-4 lg:px-8 py-6 space-y-6">
            {(location.pathname === "/admin" || location.pathname === "/admin/dashboard") && <AdminLiveLayer />}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
