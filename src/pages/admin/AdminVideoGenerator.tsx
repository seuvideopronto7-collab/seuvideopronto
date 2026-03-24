import AdminLayout from "@/components/admin/AdminLayout";
import VideoGeneratorUI from "@/components/VideoGeneratorUI";
import SafeRender from "@/components/SafeRender";

const AdminVideoGenerator = () => (
  <AdminLayout title="Geração de Vídeo" description="Pipeline real por imagem" actionLabel="Nova renderização">
    <SafeRender label="Video Generator">
      <VideoGeneratorUI />
    </SafeRender>
  </AdminLayout>
);

export default AdminVideoGenerator;
