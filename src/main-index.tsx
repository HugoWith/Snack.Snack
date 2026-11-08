import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BilletteriePage } from "./pages/billetterie/BilletteriePage";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BilletteriePage />
  </StrictMode>,
);
