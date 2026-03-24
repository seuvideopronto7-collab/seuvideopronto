import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface MainContentFallbackProps {
  showWarning?: boolean;
  onAction?: () => void;
}

const MainContentFallback = ({ showWarning = false, onAction }: MainContentFallbackProps) => {
  const location = useLocation();
  const isMainFlow = location.pathname === "/";
  const routeLabel = isMainFlow ? "Fluxo principal" : "Central de Distribuicao";

  return (
    <section
      className="rounded-2xl border border-dashed border-cyan-400/40 p-6 sm:p-8 shadow-[0_0_24px_-12px_rgba(34,211,238,0.6)]"
      style={{ backgroundColor: "#12121A" }}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
        <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
        {routeLabel}
      </div>

      <div className="mt-4 space-y-3">
        <h2 className="text-2xl sm:text-3xl font-semibold text-white">
          Gerador de Vídeo Cinematográfico
        </h2>
        <p className="text-sm text-slate-300">
          Transforme uma imagem em um vídeo profissional automaticamente.
        </p>
        <Button variant="neon" size="lg" onClick={onAction}>
          GERAR VÍDEO CINEMATOGRÁFICO
        </Button>
      </div>

      {showWarning && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-amber-300">⚠️ Módulo não carregado — inicializando interface...</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={onAction}>
              GERAR VÍDEO CINEMATOGRÁFICO
            </Button>
            <span className="text-xs text-slate-400">Reconexão automática em andamento.</span>
          </div>
          <div className="h-28 rounded-xl border border-dashed border-slate-500/60 bg-slate-900/60" />
        </div>
      )}
    </section>
  );
};

export default MainContentFallback;
