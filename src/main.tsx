
  import { createRoot } from "react-dom/client";
  import SimpleApp from "./SimpleApp.tsx";
  import "./styles.css";
  import "./styles/rtl.css";
  
// Initialize i18n - must be imported before any component that uses useTranslation
  import './i18n';

  // Use SimpleApp temporarily to debug login buttons
  createRoot(document.getElementById("root")!).render(
    <SimpleApp />
  );
  