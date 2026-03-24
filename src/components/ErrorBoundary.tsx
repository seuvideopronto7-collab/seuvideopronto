import React, { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const logError = (error: unknown, info?: React.ErrorInfo) => {
  if (info) {
    console.error("PDG ERROR:", error, info);
    return;
  }
  console.error("PDG ERROR:", error);
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    logError(error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    if (this.props.onReset) {
      this.props.onReset();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center bg-[#0d0d12] p-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-400/40 bg-[#12121A] p-6 text-center shadow-[0_0_30px_-12px_rgba(239,68,68,0.5)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-red-200/70">
              {this.props.label || "Protecao global"}
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">⚠️ Interface protegida</h2>
            <p className="mt-2 text-sm text-slate-300">
              Detectamos um erro e ativamos o modo seguro para manter o sistema funcional.
            </p>
            <Button variant="neon" size="lg" className="mt-4" onClick={this.handleReset}>
              Recarregar interface
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
