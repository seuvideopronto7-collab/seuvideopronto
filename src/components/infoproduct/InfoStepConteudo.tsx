import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import CopyField from "@/components/CopyField";
import { useState } from "react";

interface Props {
  data: any;
  isLoading: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
}

const InfoStepConteudo = ({ data, isLoading, onRegenerate, onContinue }: Props) => {
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  const [expandedAula, setExpandedAula] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="glass-card p-8 max-w-2xl mx-auto text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Criando conteúdo completo do curso...</p>
        <p className="text-xs text-muted-foreground">Gerando módulos, aulas, exemplos e exercícios</p>
      </div>
    );
  }

  if (!data) return null;

  const modulos = data.modulos || [];

  return (
    <div className="glass-card p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Conteúdo do Curso</h3>
            <p className="text-xs text-muted-foreground">{modulos.length} módulos gerados</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
          <RefreshCw className="w-4 h-4 mr-1" /> Regerar
        </Button>
      </div>

      {/* Sumário */}
      {data.ebook_sumario && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
          <p className="text-sm font-semibold mb-2">📘 Sumário do Ebook</p>
          {data.ebook_sumario.map((item: string, i: number) => (
            <p key={i} className="text-sm text-muted-foreground">{item}</p>
          ))}
        </div>
      )}

      {/* Módulos */}
      <div className="space-y-3">
        {modulos.map((mod: any, mi: number) => (
          <div key={mi} className="bg-muted/20 rounded-xl border border-border/30 overflow-hidden">
            <button
              onClick={() => setExpandedModule(expandedModule === mi ? null : mi)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {mod.numero || mi + 1}
                </span>
                <div className="text-left">
                  <p className="font-semibold text-sm">{mod.titulo}</p>
                  <p className="text-xs text-muted-foreground">{mod.aulas?.length || 0} aulas</p>
                </div>
              </div>
              {expandedModule === mi ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandedModule === mi && mod.aulas && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-muted-foreground">{mod.descricao}</p>
                {mod.aulas.map((aula: any, ai: number) => {
                  const aulaKey = `${mi}-${ai}`;
                  return (
                    <div key={ai} className="bg-card/50 rounded-lg border border-border/20 overflow-hidden">
                      <button
                        onClick={() => setExpandedAula(expandedAula === aulaKey ? null : aulaKey)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                      >
                        <span className="text-sm font-medium">
                          📖 Aula {aula.numero || ai + 1}: {aula.titulo}
                        </span>
                        {expandedAula === aulaKey ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {expandedAula === aulaKey && (
                        <div className="px-3 pb-3 space-y-3">
                          <CopyField label="Conteúdo da Aula" value={aula.conteudo} multiline />
                          {aula.exemplos?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">💡 Exemplos</p>
                              {aula.exemplos.map((ex: string, ei: number) => (
                                <p key={ei} className="text-sm text-foreground/80 ml-2">• {ex}</p>
                              ))}
                            </div>
                          )}
                          {aula.exercicio && (
                            <CopyField label="Exercício" emoji="✏️" value={aula.exercicio} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="viral" size="lg" className="w-full" onClick={onContinue}>
        🎬 GERAR AULAS EM VÍDEO
      </Button>
    </div>
  );
};

export default InfoStepConteudo;
