import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PLAN_DEFS, planOrder } from "@/lib/plans";
import {
  Rocket,
  Zap,
  Video,
  Brain,
  FileText,
  Music,
  Target,
  Check,
  Crown,
  Star,
  ArrowRight,
  Clock,
  Shield,
  MessageCircle,
} from "lucide-react";

const testimonials = [
  {
    name: "Maria S.",
    role: "Afiliada Digital",
    text: "Postei e já tive resultado no mesmo dia. Inacreditável!",
    stars: 5,
  },
  {
    name: "Carlos M.",
    role: "Lojista",
    text: "Nunca foi tão fácil criar conteúdo. Economizo horas todo dia.",
    stars: 5,
  },
  {
    name: "Ana L.",
    role: "Criadora de Conteúdo",
    text: "Meus seguidores cresceram 300% em 2 semanas usando a ferramenta.",
    stars: 5,
  },
];

const objections = [
  { q: "Não sei editar", a: "Não precisa. A IA faz tudo por você." },
  { q: "Não tenho tempo", a: "Leva menos de 1 minuto para gerar." },
  { q: "Funciona mesmo?", a: "Sim, baseado em vídeos virais reais com milhões de views." },
  { q: "Posso cancelar?", a: "Sim, cancele quando quiser. Sem fidelidade." },
];

const Landing = () => {
  const navigate = useNavigate();

  const handleCTA = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
              N7
            </div>
            <span className="font-display font-bold text-lg">Nexus7</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" onClick={handleCTA} className="bg-primary hover:bg-primary/90">
              Começar grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="container max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
            <Zap className="w-3 h-3" /> Fase Beta — Vagas limitadas
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-tight">
            Crie vídeos virais que{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
              vendem em 1 clique
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Transforme qualquer produto em um vídeo profissional pronto para postar no Instagram, TikTok e WhatsApp.{" "}
            <strong className="text-foreground">Mesmo sem saber editar.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleCTA}
              className="text-lg px-8 py-6 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white shadow-[0_0_30px_-5px_hsl(142,71%,45%/0.5)] transition-all hover:scale-105"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Gerar meu vídeo grátis
            </Button>
            <p className="text-xs text-muted-foreground">
              ✓ Sem cartão de crédito &nbsp; ✓ Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="py-6 border-y border-border/20 bg-card/30">
        <div className="container max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">5.000+</p>
            <p className="text-xs text-muted-foreground">Vídeos gerados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">200+</p>
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">4.9 ⭐</p>
            <p className="text-xs text-muted-foreground">Avaliação média</p>
          </div>
        </div>
      </section>

      {/* PROMISE */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            Você <span className="text-primary">não precisa</span> aprender edição, copy ou marketing.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Brain, text: "A IA faz tudo por você" },
              { icon: Target, text: "Você só clica e posta" },
              { icon: Rocket, text: "Resultado: mais vendas e seguidores" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="p-6 rounded-2xl bg-card/50 border border-border/30 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-card/20">
        <div className="container max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Como funciona em <span className="text-accent">3 passos</span>
            </h2>
            <p className="text-muted-foreground">Simples assim. Sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Escolha o nicho",
                desc: "Pet, emagrecimento, renda extra, estética, fitness…",
                icon: Target,
              },
              {
                step: "2",
                title: 'Clique em "Gerar vídeo"',
                desc: "A IA cria roteiro, vídeo, legenda e CTA automaticamente.",
                icon: Zap,
              },
              {
                step: "3",
                title: "Poste e venda",
                desc: "Exporte pro CapCut, publique nas redes e veja os resultados.",
                icon: Rocket,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative p-6 rounded-2xl bg-card/50 border border-border/30 space-y-4">
                <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {step}
                </div>
                <div className="pt-2">
                  <Icon className="w-8 h-8 text-accent mb-3" />
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              O que você <span className="text-primary">recebe</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: Video, label: "Vídeo pronto" },
              { icon: Brain, label: "Copy que vende" },
              { icon: FileText, label: "Legendas virais" },
              { icon: Music, label: "Sugestão de música" },
              { icon: Target, label: "CTA pronto" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/50 border border-border/30 hover:border-accent/30 transition-colors"
              >
                <Icon className="w-8 h-8 text-accent" />
                <span className="text-sm font-medium text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" className="py-20 px-4 bg-card/20">
        <div className="container max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Escolha seu <span className="text-primary">plano</span>
            </h2>
            <p className="text-muted-foreground text-sm">Comece grátis. Upgrade quando quiser.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {planOrder.filter((p) => p !== "free").map((planKey) => {
              const plan = PLAN_DEFS[planKey];
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 space-y-5 bg-card/50 backdrop-blur-sm transition-all ${
                    plan.highlight
                      ? "border-primary/60 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.4)] scale-[1.03]"
                      : "border-border/40"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Mais vendido
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{plan.label}</h3>
                    <p className="text-3xl font-bold text-primary mt-1">
                      {plan.price.replace("/mês", "")}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "secondary"}
                    onClick={handleCTA}
                  >
                    Assinar {plan.label} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            })}

            {/* Free card */}
            <div className="rounded-2xl border border-border/30 p-6 space-y-5 bg-card/30 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold">FREE</h3>
                <p className="text-3xl font-bold mt-1">
                  R$0<span className="text-sm font-normal text-muted-foreground">/sempre</span>
                </p>
                <ul className="space-y-2 mt-4">
                  <li className="text-xs text-muted-foreground flex items-center gap-2">
                    <Check className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    2 vídeos/dia
                  </li>
                  <li className="text-xs text-muted-foreground flex items-center gap-2">
                    <Check className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    Com marca d'água
                  </li>
                </ul>
              </div>
              <Button variant="ghost" className="w-full" onClick={handleCTA}>
                Começar grátis
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* OBJECTIONS */}
      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-display font-bold">
              Ainda tem <span className="text-accent">dúvidas?</span>
            </h2>
          </div>
          <div className="space-y-4">
            {objections.map(({ q, a }) => (
              <div key={q} className="p-5 rounded-2xl bg-card/50 border border-border/30 flex items-start gap-4">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">"{q}"</p>
                  <p className="text-xs text-muted-foreground mt-1">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-4 bg-card/20">
        <div className="container max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-display font-bold">
              O que nossos <span className="text-primary">usuários</span> dizem
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-2xl bg-card/50 border border-border/30 space-y-3"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground">"{t.text}"</p>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* URGENCY + FINAL CTA */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container max-w-3xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            <Clock className="w-3 h-3" /> Apenas hoje: teste grátis liberado
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold leading-tight">
            Enquanto você pensa…
            <br />
            <span className="text-primary">outros já estão vendendo com IA.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Crie seu primeiro vídeo agora e veja o resultado ainda hoje. Sem cartão, sem compromisso.
          </p>
          <Button
            size="lg"
            onClick={handleCTA}
            className="text-lg px-10 py-7 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white shadow-[0_0_40px_-5px_hsl(142,71%,45%/0.5)] transition-all hover:scale-105"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Gerar meu vídeo grátis agora
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-border/20">
        <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[8px] font-bold text-primary-foreground">
              N7
            </div>
            <span>Nexus7 – Viral Video Machine</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">
              Entrar
            </button>
            <a href="#planos" className="hover:text-foreground transition-colors">
              Planos
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Quero saber mais sobre o Nexus7!")}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </a>
          </div>
          <p>© {new Date().getFullYear()} Nexus7. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
