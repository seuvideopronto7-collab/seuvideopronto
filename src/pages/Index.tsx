import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SafeRender from "@/components/SafeRender";
import HomeHeader from "@/components/home/HomeHeader";
import HeroSection from "@/components/home/HeroSection";
import VideoSection from "@/components/home/VideoSection";
import QuickActions from "@/components/home/QuickActions";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";
import Content30Days from "@/components/Content30Days";
import DarkFlowEngine from "@/components/DarkFlowEngine";
import SalesMachine from "@/components/SalesMachine";
import VideoWizard from "@/components/wizard/VideoWizard";

type Tab = "generator" | "darkflow" | "sales" | "calendar" | "wizard";

const Index = () => {
  const auth = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const initialProduto = (location.state as any)?.produto || null;
  const autoStart = Boolean((location.state as any)?.autoStart);

  if (!auth || auth.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const openGenerator = () => setActiveTab("generator");

  const handleSelectTool = (id: string) => {
    setActiveTab(id as Tab);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      <HomeHeader />

      <main className="space-y-10 pb-20">
        <HeroSection onOpenGenerator={openGenerator} />
        <VideoSection />
        <QuickActions onSelect={handleSelectTool} />

        {/* Active tool panel */}
        {activeTab && (
          <section className="px-4">
            <div className="max-w-5xl mx-auto">
              <SafeRender label="PDG Safe Mode">
                {activeTab === "generator" && (
                  <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                    <VideoGeneratorUI />
                  </div>
                )}
                {activeTab === "darkflow" && (
                  <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                    <DarkFlowEngine />
                  </div>
                )}
                {activeTab === "sales" && (
                  <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                    <SalesMachine />
                  </div>
                )}
                {activeTab === "calendar" && (
                  <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                    <Content30Days />
                  </div>
                )}
                {activeTab === "wizard" && (
                  <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 sm:p-6">
                    <VideoWizard initialProduto={initialProduto} autoStart={autoStart} />
                  </div>
                )}
              </SafeRender>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
