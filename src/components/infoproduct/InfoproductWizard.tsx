import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InfoStepper from "./InfoStepper";
import InfoStepIdeia, { type IdeiaData } from "./InfoStepIdeia";
import InfoStepEstrutura from "./InfoStepEstrutura";
import InfoStepConteudo from "./InfoStepConteudo";
import InfoStepVideos from "./InfoStepVideos";
import InfoStepVSL from "./InfoStepVSL";
import InfoStepKitVendas from "./InfoStepKitVendas";
import InfoStepEntrega from "./InfoStepEntrega";

const InfoproductWizard = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [ideiaData, setIdeiaData] = useState<IdeiaData>({
    nome: "", nicho: "", publico: "", problema: "", promessa: "", tipo: "",
  });
  const [estruturaData, setEstruturaData] = useState<any>(null);
  const [conteudoData, setConteudoData] = useState<any>(null);
  const [vslData, setVslData] = useState<any>(null);
  const [kitData, setKitData] = useState<any>(null);

  const callAI = async (etapa: string, extra: any = {}) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-infoproduct", {
        body: { etapa, ...ideiaData, ...extra },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const ensureTipoSelecionado = () => {
    if (!ideiaData.tipo) {
      toast.error("Selecione um tipo de produto para continuar.");
      return false;
    }
    return true;
  };

  const getFlowConfig = (tipo: string) => {
    switch (tipo) {
      case "ebook":
        return { afterConteudo: "kit", afterVideos: null, afterVsl: "kit", allowedSteps: [1, 2, 3, 6, 7] };
      case "curso":
        return { afterConteudo: "videos", afterVideos: "kit", afterVsl: "kit", allowedSteps: [1, 2, 3, 4, 6, 7] };
      case "vsl":
        return { afterConteudo: "vsl", afterVideos: null, afterVsl: "kit", allowedSteps: [1, 2, 3, 5, 6, 7] };
      case "combo":
        return { afterConteudo: "videos", afterVideos: "vsl", afterVsl: "kit", allowedSteps: [1, 2, 3, 4, 5, 6, 7] };
      default:
        return { afterConteudo: "videos", afterVideos: "vsl", afterVsl: "kit", allowedSteps: [1, 2, 3, 4, 5, 6, 7] };
    }
  };

  const handleGenerateEstrutura = async () => {
    if (!ensureTipoSelecionado()) return;
    setStep(2);
    const data = await callAI("estrutura");
    if (data) setEstruturaData(data);
  };

  const handleRegenerateEstrutura = async () => {
    const data = await callAI("estrutura");
    if (data) {
      setEstruturaData(data);
      toast.success("Estrutura regenerada!");
    }
  };

  const handleGenerateConteudo = async () => {
    if (!ensureTipoSelecionado()) return;
    setStep(3);
    const data = await callAI("conteudo", { estrutura: estruturaData });
    if (data) {
      setConteudoData(data);
      toast.success("Conteúdo gerado! 📚");
    }
  };

  const handleRegenerateConteudo = async () => {
    const data = await callAI("conteudo", { estrutura: estruturaData });
    if (data) {
      setConteudoData(data);
      toast.success("Conteúdo regenerado!");
    }
  };

  const handleGenerateVSL = async () => {
    if (!ensureTipoSelecionado()) return;
    setStep(5);
    const data = await callAI("vsl", { estrutura: estruturaData });
    if (data) {
      setVslData(data);
      toast.success("VSL gerado! 🎯");
    }
  };

  const handleRegenerateVSL = async () => {
    const data = await callAI("vsl", { estrutura: estruturaData });
    if (data) {
      setVslData(data);
      toast.success("VSL regenerado!");
    }
  };

  const handleGenerateKit = async () => {
    if (!ensureTipoSelecionado()) return;
    setStep(6);
    const data = await callAI("kit_vendas", { estrutura: estruturaData });
    if (data) {
      setKitData(data);
      toast.success("Kit de vendas gerado! 🎨");
    }
  };

  const handleContinueFromConteudo = async () => {
    if (!ensureTipoSelecionado()) return;
    const flow = getFlowConfig(ideiaData.tipo);
    if (flow.afterConteudo === "videos") {
      setStep(4);
      return;
    }
    if (flow.afterConteudo === "vsl") {
      await handleGenerateVSL();
      return;
    }
    if (flow.afterConteudo === "kit") {
      await handleGenerateKit();
    }
  };

  const handleContinueFromVideos = async () => {
    if (!ensureTipoSelecionado()) return;
    const flow = getFlowConfig(ideiaData.tipo);
    if (flow.afterVideos === "vsl") {
      await handleGenerateVSL();
      return;
    }
    if (flow.afterVideos === "kit") {
      await handleGenerateKit();
    }
  };

  const handleStepClick = (nextStep: number) => {
    if (!ideiaData.tipo) {
      if (nextStep > 1) {
        toast.error("Selecione o tipo de produto antes de avançar.");
        return;
      }
      setStep(nextStep);
      return;
    }
    const { allowedSteps } = getFlowConfig(ideiaData.tipo);
    if (!allowedSteps.includes(nextStep)) {
      toast.error("Este fluxo não inclui essa etapa para o tipo selecionado.");
      return;
    }
    setStep(nextStep);
  };

  const handleRegenerateKit = async () => {
    const data = await callAI("kit_vendas", { estrutura: estruturaData });
    if (data) {
      setKitData(data);
      toast.success("Kit regenerado!");
    }
  };

  const handleReset = () => {
    setStep(1);
    setEstruturaData(null);
    setConteudoData(null);
    setVslData(null);
    setKitData(null);
    setIdeiaData({ nome: "", nicho: "", publico: "", problema: "", promessa: "", tipo: "" });
  };

  return (
    <div className="space-y-6">
      <InfoStepper currentStep={step} onStepClick={handleStepClick} />

      <div className="step-transition" key={step}>
        {step === 1 && (
          <InfoStepIdeia data={ideiaData} onChange={setIdeiaData} onContinue={handleGenerateEstrutura} />
        )}
        {step === 2 && (
          <InfoStepEstrutura
            data={estruturaData}
            isLoading={isLoading}
            onRegenerate={handleRegenerateEstrutura}
            onContinue={handleGenerateConteudo}
          />
        )}
        {step === 3 && (
          <InfoStepConteudo
            data={conteudoData}
            isLoading={isLoading}
            onRegenerate={handleRegenerateConteudo}
            onContinue={handleContinueFromConteudo}
          />
        )}
        {step === 4 && <InfoStepVideos onContinue={handleContinueFromVideos} />}
        {step === 5 && (
          <InfoStepVSL
            data={vslData}
            isLoading={isLoading}
            onRegenerate={handleRegenerateVSL}
            onContinue={handleGenerateKit}
          />
        )}
        {step === 6 && (
          <InfoStepKitVendas
            data={kitData}
            isLoading={isLoading}
            onRegenerate={handleRegenerateKit}
            onContinue={() => setStep(7)}
          />
        )}
        {step === 7 && (
          <InfoStepEntrega
            estruturaData={estruturaData}
            conteudoData={conteudoData}
            vslData={vslData}
            kitData={kitData}
            onNewProduct={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default InfoproductWizard;
