import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
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
import type { ManualInputData } from "./InputManualScreen";

interface ProdutoPronto {
  id: string;
  nome: string;
  tipo: string | null;
  nicho: string | null;
  status: "rascunho" | "finalizado" | "publicado" | null;
  estrutura?: any;
}

interface VideoWizardProps {
  initialProduto?: ProdutoPronto | null;
  autoStart?: boolean;
}

const VideoWizard = ({ initialProduto, autoStart }: VideoWizardProps) => {
  const [step, setStep] = useState(1);
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const [formData, setFormData] = useState({
    produto: "",
    nicho: "",
    publico: "",
    dor: "",
    beneficio: "",
    link: "",
    promessa: "",
    tipo: "Curso",
    objetivo: "Vendas",
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
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [produtoStatus, setProdutoStatus] = useState<"rascunho" | "finalizado" | "publicado">("rascunho");
  const { user } = useAuth();

  const goTo = (s: number) => setStep(s);

  const applyManualFallbacks = (data: ManualInputData) => ({
    produto: data.produto || "Produto sem nome",
    nicho: data.nicho || "Nicho geral",
    promessa: data.promessa || "Promessa clara e objetiva",
    publico: data.publico || "Publico interessado no tema",
    tipo: data.tipo || "Curso",
    objetivo: data.objetivo || "Vendas",
  });

  const buildEstrutura = (override?: Partial<typeof formData>, overrideEntryType?: EntryType | null) => ({
    entryType: overrideEntryType || entryType,
    formData: { ...formData, ...override },
    analysisData,
    roteiroData,
    seoData,
    variacoesData,
    videoLink,
    variacoesCount,
  });

  const persistProduto = async (override?: { status?: "rascunho" | "finalizado" | "publicado"; formData?: Partial<typeof formData> }) => {
    if (!user) return;
    const payload = {
      id: produtoId || undefined,
      user_id: user.id,
      nome: (override?.formData?.produto || formData.produto || "Produto sem nome").trim(),
      tipo: (override?.formData?.tipo || formData.tipo || "").trim(),
      nicho: (override?.formData?.nicho || formData.nicho || "").trim(),
      estrutura: buildEstrutura(override?.formData),
      status: override?.status || produtoStatus,
    };

    const { data, error } = await supabase
      .from("produtos_gerados")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      return;
    }
    if (data?.id && !produtoId) setProdutoId(data.id);
  };

  const parseMetadataFromHtml = (html: string) => {
    const getMeta = (pattern: RegExp) => {
      const match = html.match(pattern);
      return match?.[1]?.trim() || "";
    };
    const title = getMeta(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      getMeta(/<title[^>]*>([^<]+)<\/title>/i);
    const description = getMeta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      getMeta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const image = getMeta(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    return { title, description, image };
  };

  const extractReferenceData = async (rawUrl: string) => {
    const normalizedUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    try {
      const response = await fetch(normalizedUrl, { method: "GET" });
      const html = await response.text();
      const meta = parseMetadataFromHtml(html);
      return { url: normalizedUrl, ...meta };
    } catch (err) {
      console.warn("Fallback metadata", err);
      const safe = normalizedUrl.replace(/^https?:\/\//, "");
      const guessTitle = safe.split("/").filter(Boolean).slice(-1)[0]?.replace(/[-_]/g, " ") || safe.split("/")[0] || "Produto";
      return { url: normalizedUrl, title: guessTitle, description: "", image: "" };
    }
  };

  const buildSeoFallback = (reason?: string) => {
    const tituloBase = formData.produto || formData.nicho || "Seu vídeo";
    const hook = roteiroData?.roteiro?.hook || roteiroData?.roteiro_completo || "Assista até o fim";
    const descricao = `Descubra como ${formData.beneficio || "transformar seus resultados"} com ${tituloBase}. ${formData.link ? `Link: ${formData.link}` : ""}`.trim();
    const nichoTag = formData.nicho ? `#${formData.nicho.replace(/\s+/g, "").toLowerCase()}` : "#viral";
    const hashtags = ["#fyp", "#viral", "#tiktok", "#shorts", "#reels", nichoTag].slice(0, 10);
    const palavras = [formData.produto, formData.nicho, formData.publico, formData.beneficio]
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());

    return {
      seo: {
        titulos: [
          `${tituloBase}: ${hook}`,
          `${tituloBase} em 3 passos`,
          `O erro que te impede em ${formData.nicho || "seu nicho"}`,
          `Como ${formData.publico || "você"} consegue ${formData.beneficio || "resultado"}`,
          `Antes de ${tituloBase}, veja isso`,
        ],
        hashtags,
        descricao_youtube: descricao,
        descricao_tiktok: descricao.slice(0, 120),
        palavras_chave: palavras.length ? palavras.slice(0, 5) : ["viral", "conteúdo", "marketing"],
        tags_youtube: palavras.join(", ") || "viral, marketing, conteúdo",
        thumbnail_prompt: `Thumbnail com ${tituloBase}, contraste alto, texto curto e promessa clara.`,
        seo_score: 72,
      },
      _fallback: true,
      _reason: reason || "Falha na geração automática de SEO",
    };
  };

  // Step 2 → 3: Analyze content
  const handleAnalyze = async (override?: { entryType?: EntryType; formData?: Partial<typeof formData>; referenceLink?: string }) => {
    setStep(3);
    setIsLoading(true);

    const resolvedEntryType = override?.entryType || entryType;
    const resolvedFormData = { ...formData, ...override?.formData };
    const resolvedLink = override?.referenceLink ?? videoLink;

    try {
      if (resolvedEntryType === "manual") {
        // For manual, create a simulated analysis
        setAnalysisData({
          analise: {
            tema: resolvedFormData.nicho || resolvedFormData.produto,
            estilo: "Direto e persuasivo",
            emocao: "Urgência e desejo",
            padrao_viral: "Hook + Prova + CTA",
            pontos_fortes: [resolvedFormData.beneficio || "Benefício claro", "Nicho definido", "Público segmentado"],
          },
        });
        await persistProduto({ formData: resolvedFormData });
      } else if (resolvedEntryType === "reference") {
        const meta = await extractReferenceData(resolvedLink.trim());
        if (!meta.title && !meta.description) {
          toast.warning("Nao foi possivel ler o link. Usando dados basicos.");
        }
        setVideoLink(meta.url);
        const referenceFilled = {
          produto: meta.title || resolvedFormData.produto,
          promessa: meta.description || resolvedFormData.promessa,
          beneficio: meta.description || resolvedFormData.beneficio,
          link: meta.url,
        };
        const updatedFormData = { ...resolvedFormData, ...referenceFilled };
        setFormData(updatedFormData);
        setAnalysisData({
          analise: {
            tema: updatedFormData.nicho || updatedFormData.produto,
            estilo: "Direto e persuasivo",
            emocao: "Curiosidade e desejo",
            padrao_viral: "Hook + Prova + CTA",
            pontos_fortes: [updatedFormData.promessa || "Promessa clara", "Produto definido", "Oferta objetiva"],
          },
        });
        await persistProduto({ formData: updatedFormData });
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
            videoLink: resolvedLink.trim(),
            modo: "viral",
            ...resolvedFormData,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setAnalysisData(data);
        await persistProduto({ formData: resolvedFormData });
      }
    } catch (err: any) {
      console.error(err);
      const fallback = {
        analise: {
          tema: resolvedFormData.nicho || resolvedFormData.produto || "Tema principal",
          estilo: "Direto e persuasivo",
          emocao: "Curiosidade",
          padrao_viral: "Hook + Prova + CTA",
          pontos_fortes: ["Estrutura base pronta", "Contexto definido", "Objetivo claro"],
        },
        _fallback: true,
      };
      setAnalysisData(fallback);
      await persistProduto({ formData: resolvedFormData });
      toast.warning("Analise falhou. Fallback aplicado automaticamente.");
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
      await persistProduto();
    } catch (err: any) {
      console.error(err);
      const fallback = {
        roteiro: {
          hook: "Pare tudo e veja isso agora",
          abertura: "Em poucos segundos, voce vai entender como aplicar.",
          desenvolvimento: `Apresente ${formData.produto || "o produto"} com foco em resultado rapido.`,
          prova: "Mostre resultados e depoimentos reais.",
          cta: "Clique para saber mais.",
          roteiro_completo: "Hook forte, desenvolvimento direto e CTA claro.",
        },
        _fallback: true,
      };
      setRoteiroData(fallback);
      await persistProduto();
      toast.warning("Roteiro falhou. Fallback aplicado automaticamente.");
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
      await persistProduto();
    } catch (err: any) {
      console.error(err);
      const fallback = buildSeoFallback(err?.message);
      setSeoData(fallback);
      await persistProduto();
      toast.warning("SEO falhou. Fallback aplicado automaticamente.");
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
      await persistProduto();
    } catch (err: any) {
      console.error(err);
      const fallback = {
        variacoes: ["Variação alternativa 1", "Variação alternativa 2", "Variação alternativa 3"],
        _fallback: true,
      };
      setVariacoesData(fallback);
      await persistProduto();
      toast.warning("Variações falharam. Fallback aplicado automaticamente.");
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
      await persistProduto();
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 6: Transition to SEO step and generate if not already
  const handleGoToSeo = async () => {
    setStep(6);
    if (!seoData) await handleGenerateSeo();
  };

  const handleManualStart = async (data: ManualInputData) => {
    const filled = applyManualFallbacks(data);
    const updated = {
      ...formData,
      produto: filled.produto,
      nicho: filled.nicho,
      promessa: filled.promessa,
      publico: filled.publico,
      tipo: filled.tipo,
      objetivo: filled.objetivo,
    };
    setEntryType("manual");
    setFormData(updated);
    await persistProduto({ formData: updated, status: "rascunho" });
    await handleAnalyze({ entryType: "manual", formData: updated });
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
    setEntryType(null);
    setFile(null);
    setVideoLink("");
    setFormData({
      produto: "",
      nicho: "",
      publico: "",
      dor: "",
      beneficio: "",
      link: "",
      promessa: "",
      tipo: "Curso",
      objetivo: "Vendas",
    });
    setProdutoId(null);
    setProdutoStatus("rascunho");
  };

  useEffect(() => {
    if (step >= 9 && produtoStatus !== "finalizado") {
      setProdutoStatus("finalizado");
      void persistProduto({ status: "finalizado" });
    }
  }, [step, produtoStatus]);

  useEffect(() => {
    if (!initialProduto) return;
    const estrutura = initialProduto.estrutura || {};
    const nextEntryType = (estrutura.entryType || "manual") as EntryType;
    const nextForm = { ...formData, ...(estrutura.formData || {}) };
    setEntryType(nextEntryType);
    setFormData(nextForm);
    setVideoLink(estrutura.videoLink || "");
    setAnalysisData(estrutura.analysisData || null);
    setRoteiroData(estrutura.roteiroData || null);
    setSeoData(estrutura.seoData || null);
    setVariacoesData(estrutura.variacoesData || null);
    setVariacoesCount(estrutura.variacoesCount || null);
    setProdutoId(initialProduto.id);
    setProdutoStatus((initialProduto.status as any) || "rascunho");

    const stepFromData = estrutura.seoData
      ? 6
      : estrutura.roteiroData
        ? 5
        : estrutura.analysisData
          ? 3
          : 2;
    const targetStep = autoStart ? Math.max(3, stepFromData) : 2;
    setStep(targetStep);

    if (autoStart && !estrutura.analysisData) {
      void handleAnalyze({ entryType: nextEntryType, formData: nextForm, referenceLink: estrutura.videoLink });
    }
  }, [initialProduto]);

  const unlockedSteps = useMemo(() => [7, 8, 9], []);

  return (
    <div className="space-y-6">
      <Stepper currentStep={step} onStepClick={goTo} unlockedSteps={unlockedSteps} />

      <div className="step-transition" key={step}>
        {step === 1 && (
          <StepEntrada
            selected={entryType}
            onSelect={setEntryType}
            onContinue={() => goTo(2)}
            onFileSelected={(f) => setFile(f)}
            onManualSubmit={handleManualStart}
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
