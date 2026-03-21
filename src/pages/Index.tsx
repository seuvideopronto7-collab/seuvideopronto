import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VideoWizard from "@/components/wizard/VideoWizard";

const Index = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Fature</h1>
              <p className="text-xs text-muted-foreground">Engine de Vídeos Virais</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mr-2">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-neon" />
              {profile?.full_name || "Usuário"}
            </span>
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2 pb-2">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">
            Seu Vídeo Pronto
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Siga o passo a passo e crie seu vídeo viral em minutos
          </p>
        </div>

        {/* Wizard */}
        <VideoWizard />
      </main>
    </div>
  );
};

export default Index;
