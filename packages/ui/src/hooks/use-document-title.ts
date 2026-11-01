import { useEffect } from "react"

/**
 * Titre de l'onglet le temps que la page est montée (lecteurs d'écran, barre
 * d'onglets) ; le titre précédent revient au démontage.
 */
export function useDocumentTitle(titre: string) {
  useEffect(() => {
    const precedent = document.title
    document.title = titre
    return () => {
      document.title = precedent
    }
  }, [titre])
}
