import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./styles.css";
import "./styles/rtl.css";
import "./styles/accessibility.css";

// Initialize i18n - must be imported before any component that uses useTranslation
import './i18n';

// Offline-first infrastructure
import { registerSW } from './services/serviceWorker';
import { initOfflineBridge } from './services/offlineBridge';
import { useStore } from './store/store';

// Initialize Sentry error tracking (only when DSN is configured)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  });
}

// Connect offlineSlice to IndexedDB and browser events
initOfflineBridge(useStore);

// Register service worker (Workbox)
registerSW();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
    <App />
  </Sentry.ErrorBoundary>
);
