import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export interface ManualInputData {
  produto: string;
  nicho: string;
  promessa: string;
  publico: string;
  tipo: string;
  objetivo: string;
}

interface InputManualScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ManualInputData) => void;
}

const InputManualScreen = ({ open, onOpenChange, onSubmit }: InputManualScreenProps) => {
  const [values, setValues] = useState<ManualInputData>({
    produto: "",
    nicho: "",
    promessa: "",
    publico: "",
    tipo: "Curso",
    objetivo: "Vendas",
  });

  const update = (key: keyof ManualInputData, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inserir dados manualmente</DialogTitle>
          <DialogDescription>Preencha as informacoes principais para gerar com IA.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Nome do produto</Label>
            <Input value={values.produto} onChange={(e) => update("produto", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Metodo Viral Pro" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Nicho</Label>
            <Input value={values.nicho} onChange={(e) => update("nicho", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Marketing Digital" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Publico alvo</Label>
            <Input value={values.publico} onChange={(e) => update("publico", e.target.value)} className="bg-muted/50 border-border/50" placeholder="Ex: Empreendedores iniciantes" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Tipo</Label>
            <Select value={values.tipo} onValueChange={(val) => update("tipo", val)}>
              <SelectTrigger className="bg-muted/50 border-border/50">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ebook">Ebook</SelectItem>
                <SelectItem value="Curso">Curso</SelectItem>
                <SelectItem value="VSL">VSL</SelectItem>
                <SelectItem value="Produto fisico">Produto fisico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm text-muted-foreground">Promessa</Label>
            <Textarea value={values.promessa} onChange={(e) => update("promessa", e.target.value)} className="bg-muted/50 border-border/50" rows={3} placeholder="Ex: Aprenda a vender todo dia com videos curtos" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm text-muted-foreground">Objetivo</Label>
            <RadioGroup value={values.objetivo} onValueChange={(val) => update("objetivo", val)} className="flex flex-wrap gap-4">
              {[
                { label: "Vendas", value: "Vendas" },
                { label: "Viral", value: "Viral" },
                { label: "Autoridade", value: "Autoridade" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={`obj-${opt.value}`} />
                  <Label htmlFor={`obj-${opt.value}`} className="text-sm">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="neon" size="lg" onClick={handleSubmit} className="w-full sm:w-auto">
            Gerar com IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InputManualScreen;
