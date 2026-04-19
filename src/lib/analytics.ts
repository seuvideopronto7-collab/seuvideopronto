// Camada única de tracking — todos os eventos do app passam por aqui
import posthog, { isPostHogReady } from "./posthog";

export type AnalyticsEvent =
  // Landing
  | "landing_view"
  | "cta_clicked"
  // Auth
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "logout"
  // Vídeo
  | "video_started"
  | "video_completed"
  | "video_failed"
  | "video_downloaded"
  // Monetização
  | "plan_viewed"
  | "checkout_started"
  | "plan_upgraded"
  // Erros
  | "error_shown";

export const track = (event: AnalyticsEvent | string, props?: Record<string, any>) => {
  try {
    if (!isPostHogReady()) return;
    posthog.capture(event, props);
  } catch (e) {
    // nunca quebrar UI por causa de analytics
    console.error("[analytics] track error", e);
  }
};

export const identifyUser = (userId: string, props?: Record<string, any>) => {
  try {
    if (!isPostHogReady()) return;
    posthog.identify(userId, props);
  } catch (e) {
    console.error("[analytics] identify error", e);
  }
};

export const resetUser = () => {
  try {
    if (!isPostHogReady()) return;
    posthog.reset();
  } catch (e) {
    console.error("[analytics] reset error", e);
  }
};
