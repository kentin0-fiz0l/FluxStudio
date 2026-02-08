import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";
import "./styles/rtl.css";
import "./styles/accessibility.css";

// Initialize i18n - must be imported before any component that uses useTranslation
import './i18n';

createRoot(document.getElementById("root")!).render(
  <App />
);
  