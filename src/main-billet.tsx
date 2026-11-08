import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BilletPage } from "./pages/billet/BilletPage";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BilletPage />
  </StrictMode>,
);
