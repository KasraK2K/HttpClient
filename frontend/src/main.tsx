import React from "react";
import ReactDOM from "react-dom/client";
import { ToastViewport } from "./components/ui/ToastViewport";
import { applyStoredTheme } from "./lib/themes";
import App from "./pages/App";
import "./index.css";

applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ToastViewport />
  </React.StrictMode>,
);
