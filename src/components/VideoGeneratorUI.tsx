import { useState } from "react";

export default function VideoGeneratorUI() {
  const [image, setImage] = useState<File | null>(null);
  const [job, setJob] = useState<any>(null);

  async function handleGenerate() {
    if (!image) return alert("Envie uma imagem");

    const form = new FormData();
    form.append("file", image);

    const upload = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    const { url } = await upload.json();

    const res = await fetch("/api/video-jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: url,
        productType: "suplemento",
        style: "luxo",
      }),
    });

    const data = await res.json();
    setJob(data);

    poll(data.id);
  }

  async function poll(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/video-jobs/${id}`);
      const data = await res.json();

      setJob(data);

      if (data.status === "completed" || data.status === "failed") {
        clearInterval(interval);
      }
    }, 3000);
  }

  return (
    <div className="bg-[#12121A] p-6 rounded-2xl border border-[#2A2A3A] space-y-4">
      <h2 className="text-xl font-semibold text-white">
        🎬 Gerador Cinematográfico
      </h2>

      <input
        type="file"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
        className="text-white"
      />

      <button
        onClick={handleGenerate}
        className="bg-gradient-to-r from-[#F5C451] to-[#E53935] px-6 py-3 rounded-xl text-black font-bold"
      >
        GERAR VÍDEO CINEMATOGRÁFICO
      </button>

      {job && (
        <div className="space-y-2">
          <p className="text-white">Status: {job.status}</p>
          <div className="w-full bg-[#2A2A3A] h-2 rounded">
            <div
              className="bg-[#F5C451] h-2 rounded"
              style={{ width: `${job.progress}%` }}
            />
          </div>

          {job.video_url && (
            <video controls className="w-full rounded-xl mt-4">
              <source src={job.video_url} />
            </video>
          )}
        </div>
      )}
    </div>
  );
}
