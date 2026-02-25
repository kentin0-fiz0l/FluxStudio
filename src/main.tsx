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
    release: `fluxstudio@${__APP_VERSION__}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  });
}

// Core Web Vitals collection
import { onCLS, onLCP, onINP, onTTFB } from 'web-vitals';
import { observability } from './services/observability';

function reportVital(metric: { name: string; value: number; id: string; rating: string }) {
  observability.analytics.track('web_vital', {
    metric_name: metric.name,
    metric_value: metric.value,
    metric_id: metric.id,
    metric_rating: metric.rating,
  });

  // Also send to dedicated vitals endpoint
  const apiUrl = import.meta.env.VITE_API_URL || '';
  navigator.sendBeacon(
    `${apiUrl}/api/observability/vitals`,
    new Blob([JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    })], { type: 'application/json' })
  );
}

onCLS(reportVital);
onLCP(reportVital);
onINP(reportVital);
onTTFB(reportVital);

// Connect offlineSlice to IndexedDB and browser events
initOfflineBridge(useStore);

// Register service worker (Workbox)
registerSW();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>}>
    <App />
  </Sentry.ErrorBoundary>
);
