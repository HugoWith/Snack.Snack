import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MerciPage } from "./pages/merci/MerciPage";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MerciPage />
  </StrictMode>,
);
