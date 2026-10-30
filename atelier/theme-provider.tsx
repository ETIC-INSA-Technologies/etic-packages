import { useEffect, type ReactNode } from "react"

// Atelier seulement : thème du système au chargement, touche « d » pour
// basculer. Le sélecteur de thème des applications viendra de la bibliothèque.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const racine = document.documentElement
    racine.classList.toggle(
      "dark",
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )

    const basculer = (event: KeyboardEvent) => {
      const cible = event.target as HTMLElement | null
      if (
        event.key.toLowerCase() !== "d" ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        cible?.isContentEditable ||
        cible?.closest("input, textarea, select")
      ) {
        return
      }
      racine.classList.toggle("dark")
    }
    window.addEventListener("keydown", basculer)
    return () => window.removeEventListener("keydown", basculer)
  }, [])

  return children
}
