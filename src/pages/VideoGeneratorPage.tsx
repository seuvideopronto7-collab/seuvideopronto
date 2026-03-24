import { useEffect, useState } from "react";

export default function VideoGeneratorPage() {
  const [forceRender, setForceRender] = useState(0);

  useEffect(() => {
    setForceRender((prev) => prev + 1);
  }, []);

  const data = [forceRender];

  if (!data || data.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-white bg-[#0B0B0F]">
        Carregando conteúdo...
      </div>
    );
  }

  try {
    return (
      <div className="w-full min-h-screen flex flex-col bg-[#0B0B0F]">
        <div className="p-4 border-b border-[#1E1E2A]">
          <h1 className="text-white text-xl font-semibold">Seu Vídeo Pronto</h1>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2 p-6 border-r border-[#1E1E2A]">
            <p className="text-white">Upload do produto</p>
            <input type="file" className="mt-4 text-white" />
            <button className="mt-4 bg-blue-500 px-4 py-2 rounded">Gerar Vídeo</button>
          </div>

          <div className="w-full lg:w-1/2 p-6 flex items-center justify-center">
            <div className="w-full h-64 bg-[#1A1A24] rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Preview do vídeo aparecerá aqui</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    console.error("ERRO NA TELA:", e);
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-white bg-[#0B0B0F]">
        Carregando conteúdo...
      </div>
    );
  }
}
