import { Suspense, lazy, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SafeRender from "@/components/SafeRender";

const VideoGeneratorUI = lazy(() => import("@/components/VideoGeneratorUI"));

const AdminVideoGenerator = () => {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <AdminLayout
      title="Geração de Vídeo"
      description="Pipeline real por imagem"
      actionLabel={showGenerator ? "Gerador ativo" : "Carregar gerador"}
      onAction={() => setShowGenerator(true)}
    >
      {showGenerator && (
        <Suspense fallback={<div>Carregando gerador...</div>}>
          <SafeRender label="Video Generator" onAction={() => setShowGenerator(false)}>
            {VideoGeneratorUI ? <VideoGeneratorUI /> : <div>Erro ao carregar módulo</div>}
          </SafeRender>
        </Suspense>
      )}
    </AdminLayout>
  );
};

export default AdminVideoGenerator;
