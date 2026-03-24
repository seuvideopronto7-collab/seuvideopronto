import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const AdminVideoGenerator = () => {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <AdminLayout
      title="Geração de Vídeo"
      description="Pipeline real por imagem"
      actionLabel={showGenerator ? "Gerador ativo" : "Carregar gerador"}
      onAction={() => {
        console.log("Admin Master: Gerador de video acionado");
        setShowGenerator(true);
      }}
    >
      {showGenerator && (
        <VideoGeneratorUI />
      )}
    </AdminLayout>
  );
};

export default AdminVideoGenerator;
