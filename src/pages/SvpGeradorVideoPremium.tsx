export default function SvpGeradorVideoPremium() {
  const steps = [
    {
      title: "Upload Inteligente",
      desc: "Envie imagem, vídeo-base ou briefing. A IA identifica nicho, produto e estilo ideal.",
    },
    {
      title: "Roteiro Automático",
      desc: "Gancho, benefícios, CTA e texto de tela gerados automaticamente com foco em conversão.",
    },
    {
      title: "Motor Cinema PRO",
      desc: "Zoom cinematográfico, glow, partículas, parallax, trilha e narração em fluxo único.",
    },
    {
      title: "Render + Distribuição",
      desc: "Entrega em vertical 9:16, pronto para Instagram, TikTok, Shorts e download.",
    },
  ];

  const modes = [
    { name: "Modo Rápido", detail: "1 imagem + roteiro + narração + vídeo curto" },
    { name: "Modo PRO", detail: "cenas extras, storytelling, cortes premium e CTA forte" },
    { name: "Modo Escala", detail: "gera múltiplas variações para testes de criativo" },
  ];

  const presets = [
    "Produto Premium",
    "Infoproduto",
    "Moda & Beleza",
    "Saúde & Bem-estar",
    "Marketplace",
    "Lançamento",
  ];

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(88,80,236,0.22),transparent_35%),radial-gradient(circle_at_right,rgba(0,212,255,0.14),transparent_30%),linear-gradient(to_bottom,#050816,#091126)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                SVP • Motor Cinema Automático
              </div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">
                Gerador de Vídeo Premium
                <span className="block bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                  do briefing ao Reels pronto
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-white/70 md:text-base">
                Suba uma imagem, escolha o modo de criação e deixe a IA montar roteiro, narração, cenas,
                efeitos cinematográficos e render final com visual de anúncio premium.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]">
                  Gerar Vídeo Agora 🎬
                </button>
                <button className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10">
                  Ver Fluxo Completo
                </button>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {modes.map((mode) => (
                  <div key={mode.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-bold text-white">{mode.name}</div>
                    <div className="mt-1 text-xs leading-5 text-white/60">{mode.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              <div className="rounded-[24px] border border-cyan-400/20 bg-slate-950/60 p-4 shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">Painel de geração</div>
                    <div className="text-xs text-white/55">Fluxo principal + automação premium</div>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    pipeline online
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-center">
                    <div className="text-sm font-semibold">Upload da imagem principal</div>
                    <div className="mt-1 text-xs text-white/55">
                      PNG, JPG ou WEBP • produto, mockup ou capa
                    </div>
                    <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80">
                      Selecionar arquivo
                    </div>
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                        Preset
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {presets.map((preset) => (
                          <span
                            key={preset}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/75"
                          >
                            {preset}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                        Formato
                      </div>
                      <div className="space-y-2 text-sm text-white/80">
                        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                          <span>Vertical Reels</span>
                          <span className="text-cyan-300">9:16</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                          <span>Resolução</span>
                          <span className="text-cyan-300">1080 x 1920</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                      Briefing do vídeo
                    </div>
                    <textarea
                      className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white placeholder:text-white/30 focus:outline-none"
                      placeholder="Ex: Quero um vídeo cinematográfico para vender uma loção premium, com narração masculina, efeito de luxo, CTA forte e estilo de anúncio viral."
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {["Roteiro IA", "Narração PRO", "Trilha Cinemática"].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-sm font-bold">{item}</div>
                        <div className="mt-1 text-xs text-white/55">Ativado automaticamente</div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:scale-[1.01]">
                    GERAR VÍDEO PREMIUM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Fluxo de execução</h2>
                <p className="text-sm text-white/55">Passo a passo visual do pipeline</p>
              </div>
              <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold text-violet-200">
                cinema stack
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-sm font-black text-cyan-200">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{step.title}</div>
                    <div className="mt-1 text-xs leading-5 text-white/60">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Preview do projeto</h2>
                <p className="text-sm text-white/55">Visual do vídeo antes do render final</p>
              </div>
              <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                render status
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.72fr_0.28fr]">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,37,0.6),rgba(6,8,18,0.95))] p-4">
                <div className="aspect-[9/16] w-full rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_20%),linear-gradient(180deg,#0b1328,#04070f)] p-4 shadow-inner">
                  <div className="flex h-full flex-col justify-between rounded-[20px] border border-white/10 bg-white/[0.02] p-4">
                    <div>
                      <div className="inline-flex rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-red-200">
                        cena 01 • gancho
                      </div>
                      <div className="mt-4 max-w-[85%] text-2xl font-black leading-tight text-white md:text-3xl">
                        O vídeo que faz seu produto parecer anúncio de marca grande.
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs text-white/70">
                        Zoom cinematográfico • Partículas • Glow • Narração • CTA
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {["Gancho", "Benefícios", "CTA", "Legenda", "Áudio"].map((item, index) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/45">
                      Bloco {index + 1}
                    </div>
                    <div className="text-sm font-bold">{item}</div>
                    <div className="mt-1 text-xs text-white/55">Editável pelo usuário ou IA</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
