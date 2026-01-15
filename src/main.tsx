
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import SimpleApp from "./SimpleApp.tsx";
  import "./styles.css";
  import "./styles/rtl.css";
  import { ThemeProvider } from "./components/ThemeProvider";

  // Initialize i18n - must be imported before any component that uses useTranslation
  import './i18n';

  // Use SimpleApp temporarily to debug login buttons
  createRoot(document.getElementById("root")!).render(
    <SimpleApp />
  );
  