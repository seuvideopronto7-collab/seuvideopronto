import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function VideoGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setForceRender((prev) => prev + 1);
  }, []);

  const data = [forceRender];

  const stats = [
    { label: "Jobs hoje", value: 12 + forceRender, trend: "+18%" },
    { label: "Render ativos", value: 4, trend: "estavel" },
    { label: "Fila", value: 7, trend: "2 urgentes" },
  ];

  const pipeline = [
    { title: "Entrada", detail: "Upload validado", status: "ok" },
    { title: "Analise", detail: "IA reconheceu produto", status: "ok" },
    { title: "Roteiro", detail: "Hook + CTA prontos", status: "ok" },
    { title: "SEO", detail: "Fallback aplicado", status: "warn" },
    { title: "Variacoes", detail: "3 alternativas", status: "ok" },
    { title: "Montagem", detail: "Timeline 9:16", status: "pending" },
    { title: "Final", detail: "Render MP4", status: "pending" },
  ];

  const queue = [
    { id: "SVP-2910", title: "Locao Premium", eta: "2m", status: "render" },
    { id: "SVP-2908", title: "Curso Express", eta: "5m", status: "seo" },
    { id: "SVP-2901", title: "VSL Pro", eta: "8m", status: "fila" },
  ];

  const recent = [
    { id: "R-104", title: "Reels BioLift", format: "9:16", channel: "TikTok" },
    { id: "R-102", title: "Story Ad", format: "9:16", channel: "Instagram" },
    { id: "R-099", title: "Shorts Pro", format: "9:16", channel: "YouTube" },
  ];

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-white bg-[#0B0B0F]">
        Carregando conteúdo...
      </div>
    );
  }

  const handleGenerate = () => {
    console.log("Gerando vídeo");
    toast.success("Geração iniciada");
  };

  const handleDistribute = () => {
    console.log("Distribuir vídeo");
    navigate("/admin/distribution");
  };

  const handleDownload = () => {
    console.log("Baixar vídeo");
    toast.message("Download preparado");
  };

  const handleHistory = () => {
    console.log("Ver histórico");
    toast.message("Histórico carregado");
  };

  try {
    return (
      <div className="w-full min-h-screen flex flex-col bg-[#0B0B0F] text-white">
        <div className="p-5 border-b border-[#1E1E2A] bg-gradient-to-r from-[#0B0B0F] via-[#10111B] to-[#0B0B0F]">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold">Seu Vídeo Pronto</h1>
                <p className="text-xs text-white/60">Pipeline realtime com fallback automatico</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  ONLINE
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                  realtime ativo
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/60">{item.label}</div>
                  <div className="mt-2 text-2xl font-bold">{item.value}</div>
                  <div className="text-[11px] text-cyan-300/80">{item.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full px-5 py-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#11111A]/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Upload do produto</h2>
                  <p className="text-xs text-white/50">Imagem ou video base para gerar o fluxo</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">SVP CORE</span>
              </div>
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <p className="text-sm">Arraste e solte ou selecione o arquivo</p>
                <input type="file" className="mt-4 text-white" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleGenerate} className="bg-blue-500 px-4 py-2 rounded text-white">
                  Gerar Vídeo
                </button>
                <button onClick={handleDistribute} className="bg-purple-500 px-4 py-2 rounded text-white">
                  Distribuir Vídeo
                </button>
                <button onClick={handleDownload} className="bg-cyan-500 px-4 py-2 rounded text-white">
                  Baixar Vídeo
                </button>
                <button onClick={handleHistory} className="bg-slate-700 px-4 py-2 rounded text-white">
                  Ver Histórico
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11111A]/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Preview ao vivo</h2>
                  <p className="text-xs text-white/50">Render 9:16 com glow e trilha</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/80">RENDER</span>
              </div>
              <div className="w-full h-64 bg-[#1A1A24] rounded-2xl border border-white/10 flex items-center justify-center">
                <p className="text-gray-400">Preview do vídeo aparecerá aqui</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/60">
                <div className="rounded-xl bg-white/5 p-3">Formato 9:16</div>
                <div className="rounded-xl bg-white/5 p-3">1080x1920</div>
                <div className="rounded-xl bg-white/5 p-3">60fps</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#11111A]/70 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Pipeline em tempo real</h3>
                <span className="text-[11px] text-cyan-200">auto-continuo</span>
              </div>
              <div className="space-y-3">
                {pipeline.map((stepItem) => (
                  <div
                    key={stepItem.title}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold">{stepItem.title}</div>
                      <div className="text-xs text-white/50">{stepItem.detail}</div>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full border ${
                        stepItem.status === "ok"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : stepItem.status === "warn"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : "border-white/10 bg-white/5 text-white/50"
                      }`}
                    >
                      {stepItem.status === "ok" ? "ok" : stepItem.status === "warn" ? "fallback" : "aguardando"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11111A]/70 p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Fila de geracoes</h3>
                  <span className="text-[11px] text-white/50">autosync</span>
                </div>
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-[11px] text-white/50">{item.id} · ETA {item.eta}</div>
                      </div>
                      <span className="text-[11px] rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-200">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Renders recentes</h3>
                  <span className="text-[11px] text-white/50">ultimas 24h</span>
                </div>
                <div className="grid gap-2">
                  {recent.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="text-[11px] text-white/50">{item.format} · {item.channel}</div>
                      </div>
                      <button className="text-[11px] rounded-full border border-white/10 px-2 py-1 text-white/70">
                        abrir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.error("ERRO NA TELA:", e);
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-white bg-[#0B0B0F]">
        Carregando conteúdo...
      </div>
    );
  }
}
