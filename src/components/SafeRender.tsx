import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SafeRenderProps {
  children: ReactNode;
  label?: string;
  actionLabel?: string;
  onAction?: () => void;
  debug?: boolean;
}

interface SafeRenderState {
  hasError: boolean;
}

class SafeRenderBoundary extends Component<SafeRenderProps, SafeRenderState> {
  state: SafeRenderState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("PDG DEBUG: erro detectado e tratado", error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { children, label, actionLabel, onAction, debug = true } = this.props;

    if (this.state.hasError) {
      return (
        <section
          className={cn(
            "rounded-2xl border border-dashed border-amber-400/60 p-6 sm:p-8 shadow-[0_0_30px_-12px_rgba(251,191,36,0.6)]",
            debug && "pdg-safe-debug",
          )}
          style={{ backgroundColor: "#12121A" }}
        >
          {label ? (
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-200/80">
              <span className="h-2 w-2 rounded-full bg-amber-300/80" />
              {label}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white">⚠️ Módulo carregando</h2>
            <p className="text-sm text-slate-300">A interface está sendo inicializada</p>
            <Button variant="neon" size="lg" onClick={onAction || this.handleReset}>
              {actionLabel || "Recarregar módulo"}
            </Button>
          </div>
        </section>
      );
    }

    return <div className={cn(debug && "pdg-safe-debug")}>{children}</div>;
  }
}

const SafeRender = (props: SafeRenderProps) => <SafeRenderBoundary {...props} />;

export default SafeRender;
