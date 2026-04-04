import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, Settings } from "lucide-react";

const HomeHeader = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-sm font-black">
            S
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-foreground">Seu Vídeo Pronto</p>
            <p className="text-[10px] text-muted-foreground">Cinema IA</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:block text-xs text-muted-foreground mr-2">
            {profile?.full_name || "Usuário"}
          </span>

          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => navigate("/admin/dashboard")} className="h-8 px-2.5">
              <Shield className="w-4 h-4" />
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={() => navigate("/apis")} className="h-8 px-2.5">
            <Settings className="w-4 h-4" />
          </Button>

          <Button size="sm" variant="ghost" onClick={signOut} className="h-8 px-2.5 text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
