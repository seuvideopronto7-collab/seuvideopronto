import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";
import { initPostHog } from "./lib/posthog";
import { captureUTMFromURL } from "./lib/utm";

initPostHog();
captureUTMFromURL();

const attachGlobalErrorHandlers = () => {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__pdg_error_handlers_attached) return;
  w.__pdg_error_handlers_attached = true;

  window.addEventListener("error", (event) => {
    console.error("[PDG_GLOBAL_ERROR]", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno,
      stack: event.error?.stack?.split("\n").slice(0, 6).join("\n"),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    console.error("[PDG_UNHANDLED_REJECTION]", {
      message: reason?.message || String(reason),
      name: reason?.name,
      stack: reason?.stack?.split("\n").slice(0, 6).join("\n"),
    });
  });
};

attachGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Boot">
    <App />
  </ErrorBoundary>
);
