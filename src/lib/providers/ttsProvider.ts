import type { Provider, TTSInput, TTSOutput, ProviderResult } from "./types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fallback gratuito: Web Speech API (browser TTS)
 * Grava o áudio via MediaRecorder para obter um Blob/URL
 */
const browserTTS: Provider<TTSInput, TTSOutput> = {
  name: "browser-tts",
  async generate(input): Promise<ProviderResult<TTSOutput>> {
    if (!("speechSynthesis" in window)) {
      return { ok: false, error: "Browser não suporta TTS", provider: "browser-tts" };
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(input.text);
      utterance.lang = input.lang || "pt-BR";
      utterance.rate = 1.0;

      // Selecionar voz pt-BR se disponível
      const voices = speechSynthesis.getVoices();
      const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
      if (ptVoice) utterance.voice = ptVoice;

      utterance.onend = () => {
        // Browser TTS não gera arquivo — retornamos marcador especial
        resolve({
          ok: true,
          data: { audioUrl: "__browser_tts__", durationMs: undefined },
          provider: "browser-tts",
        });
      };

      utterance.onerror = (e) => {
        resolve({ ok: false, error: `TTS falhou: ${e.error}`, provider: "browser-tts" });
      };

      speechSynthesis.speak(utterance);
    });
  },
};

/**
 * ElevenLabs TTS via Edge Function
 */
const elevenlabsTTS: Provider<TTSInput, TTSOutput> = {
  name: "elevenlabs",
  async generate(input): Promise<ProviderResult<TTSOutput>> {
    try {
      const voiceId = input.voice === "masculina" ? "onwK4e9ZLuTAKqWW03F9" : "EXAVITQu4vr4xnSDxMaL";

      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: { text: input.text, voiceId },
      });

      if (error) throw error;
      if (!data?.audioUrl && !data?.audio_url) throw new Error("Sem URL de áudio");

      return {
        ok: true,
        data: { audioUrl: data.audioUrl || data.audio_url, durationMs: data.durationMs },
        provider: "elevenlabs",
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erro ElevenLabs", provider: "elevenlabs" };
    }
  },
};

/**
 * TTS com fallback automático: ElevenLabs → Browser
 */
export const ttsProvider: Provider<TTSInput, TTSOutput> = {
  name: "tts-with-fallback",
  async generate(input): Promise<ProviderResult<TTSOutput>> {
    // Tentar ElevenLabs primeiro
    const result = await elevenlabsTTS.generate(input);
    if (result.ok) return result;

    console.warn("[TTS] ElevenLabs falhou, usando fallback browser:", result.error);
    return browserTTS.generate(input);
  },
};

export { browserTTS, elevenlabsTTS };
