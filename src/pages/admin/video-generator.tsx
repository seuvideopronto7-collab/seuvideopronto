import AdminLayout from "@/components/admin/AdminLayout";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const VideoGeneratorPage = () => {
  return (
    <AdminLayout
      title="Geração de Vídeo"
      description="Pipeline real por imagem"
    >
      <VideoGeneratorUI />
    </AdminLayout>
  );
};

export default VideoGeneratorPage;
