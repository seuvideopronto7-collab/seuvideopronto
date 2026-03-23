import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { PLAN_DEFS, planOrder, formatLimitLabel } from "@/lib/plans";

const Planos = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin, profile } = useAuth();
  const { planId, updatePlan } = usePlan();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              F
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Planos</h1>
              <p className="text-xs text-muted-foreground">Escolha seu nível de produção</p>
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Sistema
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")}>
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">Planos de Produção</h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Controle real de limites, desbloqueio de features e uso diário inteligente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planOrder.map((planKey) => {
            const plan = PLAN_DEFS[planKey];
            const isActive = planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl border p-6 space-y-4 bg-card/50 backdrop-blur-sm ${
                  isActive
                    ? "border-primary/60 shadow-[0_0_30px_-6px_hsl(var(--neon-pink)/0.45)]"
                    : "border-border/40"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute top-4 right-4 rounded-full bg-accent/20 text-accent px-3 py-1 text-[10px] uppercase tracking-wide">
                    Mais popular
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-bold">{plan.label}</h3>
                  <p className="text-sm text-muted-foreground">{plan.price}</p>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="text-xs text-muted-foreground">
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {Object.entries(plan.limits)
                    .filter(([, value]) => typeof value === "number")
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatLimitLabel(key)}</span>
                        <span className="font-mono text-primary">{value as number}</span>
                      </div>
                    ))}
                </div>
                <Button
                  variant={isActive ? "neon" : "glass"}
                  className="w-full"
                  onClick={() => updatePlan(plan.id)}
                  disabled={isActive}
                >
                  {isActive ? "Plano ativo" : "Fazer upgrade"}
                </Button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Planos;
