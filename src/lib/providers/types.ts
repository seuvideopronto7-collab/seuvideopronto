// Provider abstraction layer — permite trocar providers sem mudar lógica de negócio

export interface ProviderResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  provider: string;
}

export interface ScriptOutput {
  hook: string;
  problema: string;
  amplificacao: string;
  solucao: string;
  prova: string;
  cta: string;
  fullScript: string;
  scenes: Array<{ texto: string; visual: string; emocao: string; duracao: string }>;
}

export interface ScriptInput {
  title: string;
  niche: string;
  audience: string;
  objective: "vendas" | "autoridade" | "engajamento";
  platform: string;
  duration: string;
  cta: string;
  copyBase: string;
  mode: string; // comercial | autoridade | viral | dark
  imageAnalysis?: string;
}

export interface TTSInput {
  text: string;
  voice: string;
  lang?: string;
}

export interface TTSOutput {
  audioUrl: string;
  durationMs?: number;
}

export interface ImageGenInput {
  prompt: string;
  referenceImageUrl?: string;
  aspectRatio?: string;
  sceneIndex?: number;
}

export interface ImageGenOutput {
  imageUrl: string;
}

export interface RenderInput {
  jobId: string;
  scenes: Array<{
    imageUrl: string;
    audioUrl?: string;
    text?: string;
    durationMs: number;
  }>;
  aspectRatio: string;
  musicUrl?: string;
}

export interface RenderOutput {
  videoUrl: string;
}

export interface Provider<I, O> {
  name: string;
  generate(input: I): Promise<ProviderResult<O>>;
}
