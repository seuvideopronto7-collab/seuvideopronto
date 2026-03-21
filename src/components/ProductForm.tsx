import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Zap } from "lucide-react";

interface ProductInput {
  produto: string;
  nicho: string;
  publico: string;
  dor: string;
  beneficio: string;
  link: string;
}

interface ProductFormProps {
  onGenerate: (data: ProductInput, tipo: string) => void;
  isLoading: boolean;
}

const ProductForm = ({ onGenerate, isLoading }: ProductFormProps) => {
  const [form, setForm] = useState<ProductInput>({
    produto: "",
    nicho: "",
    publico: "",
    dor: "",
    beneficio: "",
    link: "",
  });

  const update = (key: keyof ProductInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="glass-card p-6 space-y-4 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-neon-pink" />
        <h2 className="text-lg font-semibold">Input do Produto</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          placeholder="Nome do Produto"
          value={form.produto}
          onChange={(e) => update("produto", e.target.value)}
          className="bg-muted/50 border-border/50"
        />
        <Input
          placeholder="Nicho"
          value={form.nicho}
          onChange={(e) => update("nicho", e.target.value)}
          className="bg-muted/50 border-border/50"
        />
        <Input
          placeholder="Público-alvo"
          value={form.publico}
          onChange={(e) => update("publico", e.target.value)}
          className="bg-muted/50 border-border/50"
        />
        <Input
          placeholder="Link do Produto"
          value={form.link}
          onChange={(e) => update("link", e.target.value)}
          className="bg-muted/50 border-border/50"
        />
        <Textarea
          placeholder="Dor principal do público..."
          value={form.dor}
          onChange={(e) => update("dor", e.target.value)}
          className="bg-muted/50 border-border/50"
          rows={2}
        />
        <Textarea
          placeholder="Benefício principal..."
          value={form.beneficio}
          onChange={(e) => update("beneficio", e.target.value)}
          className="bg-muted/50 border-border/50"
          rows={2}
        />
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          variant="neon"
          onClick={() => onGenerate(form, "roteiro")}
          disabled={isLoading || !form.produto}
        >
          🎬 Gerar Roteiro
        </Button>
        <Button
          variant="viral"
          onClick={() => onGenerate(form, "seo")}
          disabled={isLoading || !form.produto}
        >
          🔥 Gerar SEO
        </Button>
        <Button
          variant="glass"
          onClick={() => onGenerate(form, "variacoes")}
          disabled={isLoading || !form.produto}
        >
          ⚡ Gerar 10 Variações
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;
