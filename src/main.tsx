import { createRoot } from "react-dom/client";
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

// Connect offlineSlice to IndexedDB and browser events
initOfflineBridge(useStore);

// Register service worker (Workbox)
registerSW();

createRoot(document.getElementById("root")!).render(
  <App />
);
