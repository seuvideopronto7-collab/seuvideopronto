import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStripeSubscription } from "@/hooks/useStripeSubscription";
import { PLAN_DEFS, planOrder, formatLimitLabel } from "@/lib/plans";
import { toast } from "sonner";
import { Crown, Check, Loader2, Settings } from "lucide-react";

const Planos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, isAdmin, profile } = useAuth();
  const { plan: activePlan, subscribed, loading, startCheckout, openPortal, refresh } =
    useStripeSubscription();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Assinatura ativada com sucesso! 🎉");
      void refresh();
    }
    if (searchParams.get("canceled") === "true") {
      toast.info("Checkout cancelado.");
    }
  }, [searchParams, refresh]);

  const handleUpgrade = async (priceId?: string) => {
    if (!priceId) return;
    try {
      await startCheckout(priceId);
    } catch {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold">
              N7
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Planos Nexus7</h1>
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
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold gradient-text">
            Planos de Produção
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Assine e desbloqueie a máquina de vídeos virais. Pagamento seguro via Stripe.
          </p>
          {subscribed && (
            <Button variant="outline" size="sm" className="mt-2" onClick={openPortal}>
              <Settings className="w-4 h-4 mr-1" />
              Gerenciar assinatura
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {planOrder.map((planKey) => {
              const plan = PLAN_DEFS[planKey];
              const isActive = activePlan === plan.id;
              const isFree = plan.id === "free";

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl border p-6 space-y-4 bg-card/50 backdrop-blur-sm transition-all ${
                    isActive
                      ? "border-primary/60 shadow-[0_0_30px_-6px_hsl(var(--neon-pink)/0.45)] scale-[1.02]"
                      : "border-border/40 hover:border-border/60"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute top-4 right-4 rounded-full bg-accent/20 text-accent px-3 py-1 text-[10px] uppercase tracking-wide flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Mais popular
                    </span>
                  )}

                  {isActive && (
                    <span className="absolute top-4 left-4 rounded-full bg-primary/20 text-primary px-3 py-1 text-[10px] uppercase tracking-wide flex items-center gap-1">
                      <Check className="w-3 h-3" /> Seu plano
                    </span>
                  )}

                  <div className="pt-4">
                    <h3 className="text-xl font-bold">{plan.label}</h3>
                    <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="text-xs text-muted-foreground flex items-center gap-2">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    {Object.entries(plan.limits)
                      .filter(([, value]) => typeof value === "number")
                      .map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between text-[11px] text-muted-foreground"
                        >
                          <span>{formatLimitLabel(key)}</span>
                          <span className="font-mono text-primary">
                            {Number.isFinite(value as number) ? (value as number) : "∞"}
                          </span>
                        </div>
                      ))}
                  </div>

                  {isFree ? (
                    <Button
                      variant="ghost"
                      className="w-full"
                      disabled={isActive}
                    >
                      {isActive ? "Plano atual" : "Plano gratuito"}
                    </Button>
                  ) : (
                    <Button
                      variant={isActive ? "outline" : plan.highlight ? "default" : "secondary"}
                      className="w-full"
                      onClick={() => !isActive && handleUpgrade(plan.stripePriceId)}
                      disabled={isActive}
                    >
                      {isActive ? "Plano ativo ✓" : `Assinar ${plan.label}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Planos;
