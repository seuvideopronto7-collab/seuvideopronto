import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InfoproductWizard from "@/components/infoproduct/InfoproductWizard";
import { ArrowLeft } from "lucide-react";

const Infoproduct = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold gradient-text">Criar Infoproduto</h1>
              <p className="text-xs text-muted-foreground">Fábrica de Infoprodutos com IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mr-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {profile?.full_name || "Usuário"}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2 pb-2">
          <h2 className="text-2xl md:text-3xl font-bold gradient-text">
            Transforme Qualquer Ideia em Infoproduto Completo
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Curso + Ebook + VSL + Kit de Vendas em minutos com IA
          </p>
        </div>

        <InfoproductWizard />
      </main>
    </div>
  );
};

export default Infoproduct;
