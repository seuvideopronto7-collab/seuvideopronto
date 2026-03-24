import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb } from "lucide-react";

interface IdeaSuggestion {
  titulo: string;
  nicho: string;
  objetivo: string;
  publico: string;
  problema: string;
  promessa: string;
  tipo?: string;
  viral: number;
  vendas: number;
  tendencia: number;
  hot?: boolean;
}

const IDEA_SUGGESTIONS: IdeaSuggestion[] = [
  {
    titulo: "Como ganhar dinheiro no celular",
    nicho: "Renda extra",
    objetivo: "Vendas",
    publico: "Iniciantes",
    problema: "Falta de renda e tempo para trabalhar fora",
    promessa: "Gerar renda extra usando apenas o celular",
    tipo: "curso",
    viral: 92,
    vendas: 88,
    tendencia: 90,
    hot: true,
  },
  {
    titulo: "Emagrecimento em 21 dias sem academia",
    nicho: "Emagrecimento",
    objetivo: "Autoridade",
    publico: "Mulheres ocupadas",
    problema: "Falta de tempo para treinar",
    promessa: "Perder medidas com rotina curta em casa",
    tipo: "ebook",
    viral: 87,
    vendas: 82,
    tendencia: 89,
    hot: true,
  },
  {
    titulo: "Marketing digital do zero para iniciantes",
    nicho: "Marketing digital",
    objetivo: "Vendas",
    publico: "Iniciantes",
    problema: "Nao sabe por onde comecar",
    promessa: "Criar sua primeira renda online",
    tipo: "curso",
    viral: 84,
    vendas: 90,
    tendencia: 86,
    hot: true,
  },
  {
    titulo: "Relacionamentos saudaveis sem dependencia emocional",
    nicho: "Relacionamento",
    objetivo: "Autoridade",
    publico: "Jovens adultos",
    problema: "Ciclos de relacionamento toxicos",
    promessa: "Construir relacoes seguras e maduras",
    tipo: "curso",
    viral: 76,
    vendas: 74,
    tendencia: 80,
  },
  {
    titulo: "Estetica facial em casa com resultados reais",
    nicho: "Estetica",
    objetivo: "Vendas",
    publico: "Mulheres 25-45",
    problema: "Alto custo de clinicas",
    promessa: "Rotina acessivel com resultados visiveis",
    tipo: "ebook",
    viral: 79,
    vendas: 83,
    tendencia: 81,
  },
  {
    titulo: "Rotina antiansiedade em 10 minutos",
    nicho: "Saude",
    objetivo: "Autoridade",
    publico: "Profissionais estressados",
    problema: "Crises de ansiedade e falta de foco",
    promessa: "Reduzir ansiedade com praticas rapidas",
    tipo: "curso",
    viral: 88,
    vendas: 78,
    tendencia: 87,
    hot: true,
  },
  {
    titulo: "Espiritualidade pratica para dias dificeis",
    nicho: "Espiritualidade",
    objetivo: "Autoridade",
    publico: "Pessoas em transicao",
    problema: "Falta de proposito",
    promessa: "Criar rotina espiritual simples e consistente",
    tipo: "ebook",
    viral: 72,
    vendas: 70,
    tendencia: 75,
  },
  {
    titulo: "Receitas fitness viral para secar",
    nicho: "Emagrecimento",
    objetivo: "Vendas",
    publico: "Iniciantes",
    problema: "Dificuldade em manter dieta",
    promessa: "Receitas faceis que ajudam a emagrecer",
    tipo: "ebook",
    viral: 90,
    vendas: 80,
    tendencia: 92,
  },
  {
    titulo: "Treinos rapidos de 10 minutos em casa",
    nicho: "Emagrecimento",
    objetivo: "Autoridade",
    publico: "Maes ocupadas",
    problema: "Pouco tempo para treinar",
    promessa: "Treinos curtos com resultados reais",
    tipo: "curso",
    viral: 85,
    vendas: 76,
    tendencia: 88,
  },
  {
    titulo: "Negocio local no Instagram",
    nicho: "Marketing digital",
    objetivo: "Vendas",
    publico: "Empreendedores locais",
    problema: "Poucas vendas e alcance baixo",
    promessa: "Atrair clientes todos os dias",
    tipo: "curso",
    viral: 78,
    vendas: 85,
    tendencia: 79,
  },
  {
    titulo: "Organizacao financeira para renda variavel",
    nicho: "Financas",
    objetivo: "Autoridade",
    publico: "Autonomos",
    problema: "Falta de controle do dinheiro",
    promessa: "Planejar ganhos e evitar dividas",
    tipo: "ebook",
    viral: 70,
    vendas: 73,
    tendencia: 74,
  },
  {
    titulo: "Detox digital para foco e produtividade",
    nicho: "Saude",
    objetivo: "Autoridade",
    publico: "Profissionais remotos",
    problema: "Distracao constante",
    promessa: "Recuperar foco com habitos simples",
    tipo: "ebook",
    viral: 82,
    vendas: 75,
    tendencia: 83,
  },
];

const NICHE_EMOJI: Record<string, string> = {
  "Renda extra": "💰",
  Emagrecimento: "🏋️",
  Relacionamento: "❤️",
  Estetica: "💄",
  "Marketing digital": "📲",
  Saude: "🧠",
  Espiritualidade: "✨",
  Financas: "💵",
};

const getNicheEmoji = (nicho: string) => NICHE_EMOJI[nicho] || "✨";

export interface IdeiaData {
  nome: string;
  nicho: string;
  publico: string;
  problema: string;
  promessa: string;
  tipo: string;
}

interface Props {
  data: IdeiaData;
  onChange: (data: IdeiaData) => void;
  onContinue: () => void;
}

const InfoStepIdeia = ({ data, onChange, onContinue }: Props) => {
  const canContinue = data.nicho && data.publico && data.problema && data.promessa && data.tipo;
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<IdeaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isViralMode, setIsViralMode] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const hotIdeas = useMemo(() => IDEA_SUGGESTIONS.filter((idea) => idea.hot), []);

  useEffect(() => {
    const handler = setTimeout(() => {
      const term = searchTerm.trim().toLowerCase();
      if (!term && !isViralMode) {
        setSuggestions([]);
        setShowSuggestions(false);
        setUsingFallback(false);
        return;
      }

      if (isViralMode && !term) {
        setSuggestions(hotIdeas);
        setShowSuggestions(true);
        setUsingFallback(false);
        return;
      }

      const filtered = IDEA_SUGGESTIONS.filter((idea) =>
        [idea.titulo, idea.nicho, idea.objetivo, idea.publico, idea.promessa]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );

      if (filtered.length === 0) {
        setSuggestions(IDEA_SUGGESTIONS.slice(0, 5));
        setUsingFallback(true);
        setShowSuggestions(true);
        return;
      }

      setSuggestions(filtered.slice(0, 6));
      setUsingFallback(false);
      setShowSuggestions(true);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, isViralMode, hotIdeas]);

  const handleSelectIdea = (idea: IdeaSuggestion) => {
    onChange({
      ...data,
      nome: idea.titulo,
      nicho: idea.nicho,
      publico: idea.publico,
      problema: idea.problema,
      promessa: idea.promessa,
      tipo: data.tipo,
    });
    setSearchTerm(idea.titulo);
    setShowSuggestions(false);
    setIsViralMode(false);
    setUsingFallback(false);
  };

  return (
    <div className="glass-card p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Ideia do Produto</h3>
          <p className="text-xs text-muted-foreground">Defina a base do seu infoproduto</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">🔍 Pesquise sua ideia</label>
              <p className="text-xs text-muted-foreground">Digite uma palavra e descubra ideias que vendem</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsViralMode(true);
                setSearchTerm("");
                setShowSuggestions(true);
              }}
            >
              🔥 Ver ideias quentes
            </Button>
          </div>
          <div className="relative">
            <Input
              placeholder="🔍 Pesquise sua ideia (ex: renda extra, emagrecimento...)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsViralMode(false);
              }}
              onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-border/60 bg-card/90 backdrop-blur-md shadow-lg">
                <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{usingFallback ? "Sugestoes populares" : "Sugestoes inteligentes"}</span>
                  {isViralMode && <span className="text-primary">Viral agora</span>}
                </div>
                <div className="max-h-72 overflow-auto">
                  {suggestions.map((idea) => (
                    <button
                      type="button"
                      key={`${idea.titulo}-${idea.nicho}`}
                      onClick={() => handleSelectIdea(idea)}
                      className="w-full text-left px-3 py-3 hover:bg-accent/60 transition-colors flex gap-3"
                    >
                      <div className="mt-0.5 text-lg">{getNicheEmoji(idea.nicho)}</div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{idea.titulo}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {idea.nicho}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{idea.publico} · {idea.objetivo}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[10px]">🔥 {idea.viral}% viral</Badge>
                          <Badge variant="outline" className="text-[10px]">💰 {idea.vendas}% venda</Badge>
                          <Badge variant="outline" className="text-[10px]">📈 {idea.tendencia}% tendencia</Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nome do produto (opcional)</label>
          <Input
            placeholder="Ex: Método X para Y"
            value={data.nome}
            onChange={(e) => onChange({ ...data, nome: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Nicho *</label>
          <Input
            placeholder="Ex: Marketing digital, fitness, finanças..."
            value={data.nicho}
            onChange={(e) => onChange({ ...data, nicho: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Público-alvo *</label>
          <Input
            placeholder="Ex: Iniciantes em renda extra, mães empreendedoras..."
            value={data.publico}
            onChange={(e) => onChange({ ...data, publico: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Problema que resolve *</label>
          <Textarea
            placeholder="Qual dor seu produto resolve?"
            value={data.problema}
            onChange={(e) => onChange({ ...data, problema: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Promessa principal *</label>
          <Textarea
            placeholder="Qual o resultado final que o aluno vai alcançar?"
            value={data.promessa}
            onChange={(e) => onChange({ ...data, promessa: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Tipo de infoproduto *</label>
          <Select value={data.tipo} onValueChange={(value) => onChange({ ...data, tipo: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ebook">Ebook</SelectItem>
              <SelectItem value="curso">Curso</SelectItem>
              <SelectItem value="vsl">VSL</SelectItem>
              <SelectItem value="combo">Combo</SelectItem>
            </SelectContent>
          </Select>
          {data.tipo && (
            <div className="mt-2 text-xs rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-muted-foreground">
              Você está criando: <span className="font-semibold text-foreground">{data.tipo.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      <Button
        variant="viral"
        size="lg"
        className="w-full"
        disabled={!canContinue}
        onClick={onContinue}
      >
        🚀 GERAR PRODUTO
      </Button>
    </div>
  );
};

export default InfoStepIdeia;
