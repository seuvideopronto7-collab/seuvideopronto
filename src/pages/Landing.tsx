import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PLAN_DEFS, type PlanId } from "@/lib/plans";
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
  Upload,
  Sparkles,
  TrendingUp,
  Users,
  Play,
  ImageIcon,
  Wand2,
} from "lucide-react";

/* ── testimonials ── */
const testimonials = [
  { name: "Maria S.", role: "Afiliada Digital", text: "Postei e já tive resultado no mesmo dia. Inacreditável!", stars: 5 },
  { name: "Carlos M.", role: "Lojista", text: "Nunca foi tão fácil criar conteúdo. Economizo horas todo dia.", stars: 5 },
  { name: "Ana L.", role: "Criadora de Conteúdo", text: "Meus seguidores cresceram 300% em 2 semanas usando a ferramenta.", stars: 5 },
];

const objections = [
  { q: "Não sei editar", a: "Não precisa. A IA faz tudo por você." },
  { q: "Não tenho tempo", a: "Leva menos de 1 minuto para gerar." },
  { q: "Funciona mesmo?", a: "Sim, baseado em vídeos virais reais com milhões de views." },
  { q: "Posso cancelar?", a: "Sim, cancele quando quiser. Sem fidelidade." },
];

const pricingPlans: { key: PlanId; cta: string }[] = [
  { key: "start", cta: "Começar agora por R$29/mês" },
  { key: "pro", cta: "Assinar PRO por R$97/mês" },
  { key: "premium", cta: "Assinar PREMIUM por R$197/mês" },
];

const Landing = () => {
  const navigate = useNavigate();
  const handleCTA = () => navigate("/auth");
  const scrollToPlanos = () => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ════════ NAVBAR ════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Seu Vídeo Pronto</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button size="sm" onClick={scrollToPlanos} className="bg-primary hover:bg-primary/90">
              Ver planos
            </Button>
          </div>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section className="relative pt-28 sm:pt-36 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="container max-w-4xl mx-auto text-center relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium animate-pulse">
            <Zap className="w-3 h-3" /> +3.217 vídeos gerados hoje
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
            Crie vídeos virais com IA{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
              em 1 clique
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transforme qualquer produto ou imagem em vídeos que{" "}
            <strong className="text-foreground">vendem automaticamente</strong>. Sem saber editar. Sem perder tempo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={scrollToPlanos}
              className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)] transition-all hover:scale-105"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Começar agora por R$29/mês
            </Button>
            <Button variant="outline" size="lg" onClick={handleCTA} className="text-base px-6 py-5 border-border/40">
              <Play className="w-4 h-4 mr-2" />
              Ver exemplo
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ✓ Cancele quando quiser &nbsp;&nbsp; ✓ Vídeos prontos em minutos &nbsp;&nbsp; ✓ Sem edição manual
          </p>
        </div>
      </section>

      {/* ════════ SOCIAL PROOF BAR ════════ */}
      <section className="py-6 border-y border-border/20 bg-card/30">
        <div className="container max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-10 text-center">
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

      {/* ════════ PROVA VISUAL (ANTES / DEPOIS) ════════ */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">
              De uma imagem comum para um{" "}
              <span className="text-primary">vídeo que vende</span>
            </h2>
            <p className="text-muted-foreground">Veja a transformação em segundos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* ANTES */}
            <div className="relative rounded-2xl border-2 border-dashed border-border/50 bg-card/30 p-8 flex flex-col items-center justify-center min-h-[280px] space-y-4">
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Antes
              </div>
              <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm text-center">Imagem simples do produto</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> Sem engajamento
              </div>
            </div>

            {/* DEPOIS */}
            <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-accent/5 p-8 flex flex-col items-center justify-center min-h-[280px] space-y-4 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider">
                Depois
              </div>
              <div className="relative">
                <Video className="w-16 h-16 text-primary" />
                <Sparkles className="w-6 h-6 text-accent absolute -top-1 -right-2 animate-pulse" />
              </div>
              <p className="text-foreground text-sm text-center font-medium">Vídeo viral com roteiro, narração e CTA</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-primary flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +500% alcance</span>
                <span className="text-accent flex items-center gap-1"><Users className="w-3 h-3" /> +300% vendas</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button onClick={scrollToPlanos} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <Wand2 className="w-4 h-4 mr-2" /> Quero transformar meus produtos
            </Button>
          </div>
        </div>
      </section>

      {/* ════════ BENEFÍCIOS ════════ */}
      <section className="py-20 px-4 bg-card/20">
        <div className="container max-w-4xl mx-auto text-center space-y-10">
          <h2 className="text-3xl md:text-4xl font-bold">
            Por que usar o <span className="text-primary">Seu Vídeo Pronto</span>?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Video, title: "Gerar vídeos automaticamente", desc: "IA cria roteiro, narração e vídeo em minutos" },
              { icon: TrendingUp, title: "Aumentar vendas", desc: "Vídeos otimizados para conversão e anúncios" },
              { icon: Shield, title: "Criar autoridade", desc: "Conteúdo profissional que posiciona sua marca" },
              { icon: Rocket, title: "Conteúdo viral em escala", desc: "Gere dezenas de vídeos por dia sem esforço" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-card/50 border border-border/30 space-y-3 hover:border-primary/30 transition-colors text-left">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ COMO FUNCIONA ════════ */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">
              Como funciona em <span className="text-accent">3 passos</span>
            </h2>
            <p className="text-muted-foreground">Simples assim. Sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Suba uma imagem ou produto", desc: "Envie uma foto, descreva seu produto ou escolha um nicho.", icon: Upload },
              { step: "2", title: "IA cria tudo automaticamente", desc: "Roteiro persuasivo + narração + vídeo gerado pela IA.", icon: Sparkles },
              { step: "3", title: "Receba pronto para postar", desc: "Baixe o vídeo, exporte pro CapCut e publique nas redes.", icon: Rocket },
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

      {/* ════════ O QUE VOCÊ RECEBE ════════ */}
      <section className="py-20 px-4 bg-card/20">
        <div className="container max-w-4xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              O que você <span className="text-primary">recebe</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: Video, label: "Vídeo pronto 9:16" },
              { icon: Brain, label: "Copy que vende" },
              { icon: FileText, label: "Legendas virais" },
              { icon: Music, label: "Sugestão de música" },
              { icon: Target, label: "CTA pronto" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card/50 border border-border/30 hover:border-accent/30 transition-colors">
                <Icon className="w-8 h-8 text-accent" />
                <span className="text-sm font-medium text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ PLANOS ════════ */}
      <section id="planos" className="py-20 px-4">
        <div className="container max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">
              Escolha seu <span className="text-primary">plano</span>
            </h2>
            <p className="text-muted-foreground text-sm">Comece a gerar vídeos profissionais hoje mesmo.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingPlans.map(({ key, cta }) => {
              const plan = PLAN_DEFS[key];
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-7 space-y-5 bg-card/50 backdrop-blur-sm transition-all ${
                    plan.highlight
                      ? "border-primary/60 shadow-[0_0_50px_-10px_hsl(var(--primary)/0.4)] scale-[1.04]"
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
                      R${plan.priceAmount}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full h-11 font-semibold ${plan.highlight ? "bg-primary hover:bg-primary/90 shadow-lg" : ""}`}
                    variant={plan.highlight ? "default" : "secondary"}
                    onClick={handleCTA}
                  >
                    {cta.includes("Começar") ? cta : `Assinar ${plan.label}`}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════ OBJEÇÕES / FAQ ════════ */}
      <section className="py-20 px-4 bg-card/20">
        <div className="container max-w-3xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
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

      {/* ════════ DEPOIMENTOS ════════ */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto space-y-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              O que nossos <span className="text-primary">usuários</span> dizem
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-card/50 border border-border/30 space-y-3">
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

      {/* ════════ URGÊNCIA + CTA FINAL ════════ */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="container max-w-3xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
            <Clock className="w-3 h-3" /> Vagas limitadas — comece agora
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Comece hoje e gere seus primeiros vídeos{" "}
            <span className="text-primary">em minutos</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enquanto você pensa, outros já estão vendendo com IA. Não fique para trás.
          </p>
          <Button
            size="lg"
            onClick={scrollToPlanos}
            className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 shadow-[0_0_50px_-8px_hsl(var(--primary)/0.5)] transition-all hover:scale-105"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Começar agora por R$29/mês
          </Button>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-8 px-4 border-t border-border/20">
        <div className="container max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Play className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
            </div>
            <span>Seu Vídeo Pronto</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">Entrar</button>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Quero saber mais sobre o Seu Vídeo Pronto!")}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </a>
          </div>
          <p>© {new Date().getFullYear()} Seu Vídeo Pronto. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── Tracking pixel placeholder ── */}
      {/* <noscript><img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=PIXEL_ID&ev=PageView&noscript=1" alt="" /></noscript> */}
    </div>
  );
};

export default Landing;
