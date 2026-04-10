import { Flame, ShoppingCart, Calendar, Compass, Camera, Clapperboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  onSelect: (tab: string) => void;
}

const actions = [
  { id: "viral-machine", icon: Flame, label: "🔥 Viral Machine", desc: "Vídeo viral grátis", color: "from-orange-600 to-red-600", route: "/viral-machine" },
  { id: "video-machine", icon: Clapperboard, label: "Máquina de Vídeo", desc: "Pipeline completo", color: "from-cyan-600 to-blue-600", route: "/video-machine" },
  { id: "imagem-video", icon: Camera, label: "Imagem → Vídeo", desc: "Vídeo comercial com IA", color: "from-pink-600 to-rose-600", route: "/imagem-para-video" },
  { id: "sales", icon: ShoppingCart, label: "Máquina de Vendas", desc: "Automação comercial", color: "from-emerald-600 to-green-600" },
  { id: "calendar", icon: Calendar, label: "30 Dias", desc: "Calendário de conteúdo", color: "from-blue-600 to-indigo-600" },
  { id: "wizard", icon: Compass, label: "Video Wizard", desc: "Passo a passo guiado", color: "from-purple-600 to-violet-600" },
];

const QuickActions = ({ onSelect }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <section className="px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-4">🚀 Ferramentas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => (a as any).route ? navigate((a as any).route) : onSelect(a.id)}
                className="group relative rounded-xl p-4 border border-border/30 bg-card/30 backdrop-blur-sm hover:border-primary/40 transition-all hover:scale-105 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] text-left"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-foreground">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickActions;
