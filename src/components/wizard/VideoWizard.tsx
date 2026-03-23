import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Stepper from "./Stepper";
import StepEntrada, { type EntryType } from "./StepEntrada";
import StepConteudo from "./StepConteudo";
import StepAnalise from "./StepAnalise";
import StepModo from "./StepModo";
import StepRoteiro from "./StepRoteiro";
import StepSeo from "./StepSeo";
import StepVariacoes from "./StepVariacoes";
import StepMontagem from "./StepMontagem";
import StepFinal from "./StepFinal";
import StepPublicacao from "./StepPublicacao";

const VideoWizard = () => {
  const [step, setStep] = useState(1);
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const [formData, setFormData] = useState({
    produto: "", nicho: "", publico: "", dor: "", beneficio: "", link: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [videoLink, setVideoLink] = useState("");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [generationMode, setGenerationMode] = useState<string | null>(null);
  const [roteiroData, setRoteiroData] = useState<any>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [variacoesData, setVariacoesData] = useState<any>(null);
  const [variacoesCount, setVariacoesCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const goTo = (s: number) => setStep(s);

  // Step 2 → 3: Analyze content
  const handleAnalyze = async () => {
    setStep(3);
    setIsLoading(true);

    try {
      if (entryType === "manual") {
        // For manual, create a simulated analysis
        setAnalysisData({
          analise: {
            tema: formData.nicho || formData.produto,
            estilo: "Direto e persuasivo",
            emocao: "Urgência e desejo",
            padrao_viral: "Hook + Prova + CTA",
            pontos_fortes: [formData.beneficio || "Benefício claro", "Nicho definido", "Público segmentado"],
          },
        });
      } else {
        // Upload file if needed
        let fileUrl = "";
        if (file) {
          const ext = file.name.split(".").pop();
          const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("media-uploads")
            .upload(path, file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("media-uploads").getPublicUrl(path);
          fileUrl = urlData.publicUrl;
        }

        const { data, error } = await supabase.functions.invoke("analyze-content", {
          body: {
            fileUrl,
            videoLink: videoLink.trim(),
            modo: "viral",
            ...formData,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAnalysisData(data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao analisar");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4 → 5: Generate roteiro
  const handleGenerateRoteiro = async () => {
    setStep(5);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: { ...formData, tipo: "roteiro" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRoteiroData(data);
      toast.success("Roteiro gerado! 🎬");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar roteiro");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate SEO
  const handleGenerateSeo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: { ...formData, tipo: "seo" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSeoData(data);
      toast.success("SEO gerado! 🔥");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar SEO");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate variations
  const handleGenerateVariacoes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: { ...formData, tipo: "variacoes" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Trim to selected count
      if (data.variacoes && variacoesCount) {
        data.variacoes = data.variacoes.slice(0, variacoesCount);
      }
      setVariacoesData(data);
      toast.success("Variações geradas! ⚡");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar variações");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Regenerate roteiro
  const handleRegenerateRoteiro = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-viral", {
        body: { ...formData, tipo: "roteiro" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRoteiroData(data);
      toast.success("Roteiro regenerado! 🎬");
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Transition to SEO step and generate if not already
  const handleGoToSeo = () => {
    setStep(6);
    if (!seoData) handleGenerateSeo();
  };

  // Reset for new version
  const handleNewVersion = () => {
    setStep(1);
    setRoteiroData(null);
    setSeoData(null);
    setVariacoesData(null);
    setAnalysisData(null);
    setGenerationMode(null);
    setVariacoesCount(null);
  };

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} onStepClick={goTo} />

      <div className="step-transition" key={step}>
        {step === 1 && (
          <StepEntrada
            selected={entryType}
            onSelect={setEntryType}
            onContinue={() => goTo(2)}
            onFileSelected={(f) => setFile(f)}
          />
        )}
        {step === 2 && (
          <StepConteudo
            entryType={entryType!}
            formData={formData}
            onFormChange={setFormData}
            file={file}
            onFileChange={setFile}
            videoLink={videoLink}
            onVideoLinkChange={setVideoLink}
            onContinue={handleAnalyze}
          />
        )}
        {step === 3 && (
          <StepAnalise analysisData={analysisData} isLoading={isLoading} onContinue={() => goTo(4)} />
        )}
        {step === 4 && (
          <StepModo
            selected={generationMode}
            onSelect={setGenerationMode}
            onGenerate={handleGenerateRoteiro}
            isLoading={isLoading}
          />
        )}
        {step === 5 && (
          <StepRoteiro
            data={roteiroData}
            onRegenerate={handleRegenerateRoteiro}
            onContinue={handleGoToSeo}
            isLoading={isLoading}
          />
        )}
        {step === 6 && (
          <StepSeo
            data={seoData}
            onRegenerate={handleGenerateSeo}
            onContinue={() => goTo(7)}
            isLoading={isLoading}
          />
        )}
        {step === 7 && (
          <StepVariacoes
            variacoesData={variacoesData}
            variacoesCount={variacoesCount}
            onSelectCount={setVariacoesCount}
            onGenerate={handleGenerateVariacoes}
            onContinue={() => goTo(8)}
            isLoading={isLoading}
          />
        )}
        {step === 8 && <StepMontagem onContinue={() => goTo(9)} />}
        {step === 9 && (
          <StepFinal
            roteiroData={roteiroData}
            seoData={seoData}
            onNewVersion={handleNewVersion}
            onContinue={() => goTo(10)}
          />
        )}
        {step === 10 && <StepPublicacao roteiroData={roteiroData} seoData={seoData} />}
      </div>
    </div>
  );
};

export default VideoWizard;
