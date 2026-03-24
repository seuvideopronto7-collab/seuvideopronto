import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

const attachGlobalErrorHandlers = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    console.error("PDG ERROR: window", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("PDG ERROR: unhandledrejection", event.reason);
  });
};

attachGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="Boot">
    <App />
  </ErrorBoundary>
);
