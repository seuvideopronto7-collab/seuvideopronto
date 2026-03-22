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
    nome: "", nicho: "", publico: "", problema: "", promessa: "",
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

  const handleGenerateEstrutura = async () => {
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
    setStep(6);
    const data = await callAI("kit_vendas", { estrutura: estruturaData });
    if (data) {
      setKitData(data);
      toast.success("Kit de vendas gerado! 🎨");
    }
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
    setIdeiaData({ nome: "", nicho: "", publico: "", problema: "", promessa: "" });
  };

  return (
    <div className="space-y-6">
      <InfoStepper currentStep={step} onStepClick={setStep} />

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
            onContinue={() => setStep(4)}
          />
        )}
        {step === 4 && <InfoStepVideos onContinue={handleGenerateVSL} />}
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
