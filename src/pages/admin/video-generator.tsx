import AdminLayout from "@/components/admin/AdminLayout";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";

const VideoGeneratorPage = () => {
  return (
    <AdminLayout title="Geração de Vídeo" description="Jobs assíncronos com monitoramento real" actionLabel="Nova renderização">
      <VideoGeneratorUI />
    </AdminLayout>
  );
};

export default VideoGeneratorPage;
