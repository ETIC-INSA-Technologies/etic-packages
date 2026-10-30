import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./atelier.css"
import { Atelier } from "./Atelier"
import { ThemeProvider } from "./theme-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Atelier />
    </ThemeProvider>
  </StrictMode>
)
