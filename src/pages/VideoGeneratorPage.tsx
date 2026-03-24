import VideoGeneratorUI from "@/components/VideoGeneratorUI";
import SafeRender from "@/components/SafeRender";

export default function VideoGeneratorPage() {
  return (
    <div className="space-y-6">
      <SafeRender label="Video Generator">
        <VideoGeneratorUI />
      </SafeRender>
    </div>
  );
}
