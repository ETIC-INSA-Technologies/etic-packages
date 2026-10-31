import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./atelier.css"
import { Atelier } from "./Atelier"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Atelier />
  </StrictMode>
)
