
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import SimpleApp from "./SimpleApp.tsx";
  import "./styles.css";
  import { ThemeProvider } from "./components/ThemeProvider";

  // Use SimpleApp temporarily to debug login buttons
  createRoot(document.getElementById("root")!).render(
    <SimpleApp />
  );
  