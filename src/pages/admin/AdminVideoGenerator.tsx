import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import SafeRender from "@/components/SafeRender";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

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
        <SafeRender label="Video Generator" onAction={() => setShowGenerator(false)}>
          <VideoGeneratorUI />
        </SafeRender>
      )}
    </AdminLayout>
  );
};

export default AdminVideoGenerator;
