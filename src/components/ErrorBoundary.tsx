import React from "react";

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("PDG ERROR:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#12121A] p-6 rounded-xl text-center text-red-400">
          ⚠️ Erro detectado — módulo protegido pelo PDG
        </div>
      );
    }

    return this.props.children;
  }
}
