import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, Settings, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

const HomeHeader = () => {
  const { user, signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0] : "Usuário");
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80 focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-sm font-black shrink-0">
            S
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-foreground">Seu Vídeo Pronto</p>
            <p className="text-[10px] text-muted-foreground">Cinema IA</p>
          </div>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/admin/dashboard")}
              className="h-8 px-2.5 transition-colors duration-150"
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors duration-150 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <Avatar className="h-8 w-8 border border-border/40">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-red-600 to-purple-700 text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate">
                    {displayName}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/dashboard")}
                className="cursor-pointer gap-2 transition-colors duration-150"
              >
                <User className="w-4 h-4" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/apis")}
                className="cursor-pointer gap-2 transition-colors duration-150"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
