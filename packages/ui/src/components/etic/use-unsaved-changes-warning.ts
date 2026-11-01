import { useEffect, useRef } from "react"

/**
 * Tant que la page a des modifications non enregistrées, fermer l'onglet, le
 * recharger ou quitter le site demande confirmation au navigateur
 * (`beforeunload` ; il affiche son propre message, qu'aucune page ne peut
 * changer). `modifie` est un booléen, ou une fonction lue au moment de
 * quitter (état tenu hors du rendu, comme `nonEnregistre` de
 * `useDraftAutosave`). Une navigation interne à l'application ne le
 * déclenche pas : c'est le rôle du routeur, avec `UnsavedChangesDialog`.
 */
export function useUnsavedChangesWarning(modifie: boolean | (() => boolean)) {
  const dernier = useRef(modifie)
  useEffect(() => {
    dernier.current = modifie
  })
  // Un booléen faux n'installe rien ; une fonction est consultée à chaque fois.
  const actif = modifie !== false

  useEffect(() => {
    if (!actif) return
    function avantDeQuitter(event: BeforeUnloadEvent) {
      const lu = dernier.current
      if (typeof lu === "function" ? lu() : lu) event.preventDefault()
    }
    window.addEventListener("beforeunload", avantDeQuitter)
    return () => window.removeEventListener("beforeunload", avantDeQuitter)
  }, [actif])
}
