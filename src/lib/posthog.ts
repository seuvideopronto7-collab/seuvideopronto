// PostHog client — graceful no-op se VITE_POSTHOG_KEY não estiver configurado
import posthog from "posthog-js";

let initialized = false;

export const initPostHog = () => {
  if (typeof window === "undefined") return;
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

  if (!key) {
    console.info("[posthog] VITE_POSTHOG_KEY não configurado — analytics desativado");
    return;
  }

  try {
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // controlamos manualmente p/ evitar ruído
      loaded: () => {
        initialized = true;
        console.info("[posthog] inicializado");
      },
    });
  } catch (e) {
    console.error("[posthog] erro init", e);
  }
};

export const isPostHogReady = () => initialized;
export default posthog;
