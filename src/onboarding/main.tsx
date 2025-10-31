import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Onboarding from "./Onboarding.tsx";
import "./onboarding.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Onboarding />
  </StrictMode>
);
