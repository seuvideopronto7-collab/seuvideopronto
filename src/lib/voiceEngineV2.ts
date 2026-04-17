// Cliente do Voice Engine V2 — fallback em camadas server-side (ElevenLabs → OpenAI),
// e fallback browser (Web Speech API) se a edge devolver "__browser_tts__".

import { supabase } from "@/integrations/supabase/client";

export interface VoiceV2Result {
  audioUrl: string; // pode ser "__browser_tts__"
  provider: "elevenlabs" | "openai" | "browser";
  fallback_used: boolean;
  bytes?: number;
  attempts?: string[];
}

export async function gerarNarracaoV2(text: string, jobId?: string): Promise<VoiceV2Result> {
  const { data, error } = await supabase.functions.invoke("generate-voiceover-v2", {
    body: { text, jobId },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "voiceover failed");
  return {
    audioUrl: data.audioUrl,
    provider: data.provider,
    fallback_used: !!data.fallback_used,
    bytes: data.bytes,
    attempts: data.attempts,
  };
}

/**
 * Sintetiza no browser via Web Speech API quando o servidor sinaliza "__browser_tts__".
 * Não retorna URL persistida — apenas garante que o usuário OUÇA algo.
 */
export function falarNoBrowser(text: string, lang = "pt-BR"): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Browser sem suporte a TTS"));
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith("pt"));
    if (v) utt.voice = v;
    utt.onend = () => resolve();
    utt.onerror = (e) => reject(new Error(`TTS browser falhou: ${e.error}`));
    speechSynthesis.speak(utt);
  });
}

export const isBrowserTTS = (audioUrl: string) => audioUrl === "__browser_tts__";
