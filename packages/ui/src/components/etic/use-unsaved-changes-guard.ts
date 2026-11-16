import { useCallback, useEffect, useRef } from "react"

import { useUnsavedChangesWarning } from "@etic-ui/components/etic/use-unsaved-changes-warning"

/** Ce qu'un routeur sait d'une adresse : son chemin, au moins. */
export interface EmplacementRouteur {
  pathname: string
}

/** La navigation demandée, telle que le routeur la soumet à son garde
 *  (`useBlocker` de react-router : `currentLocation`, `nextLocation`). */
export interface NavigationDemandee<L extends EmplacementRouteur> {
  currentLocation: L
  nextLocation: L
}

/** Par défaut, changer seulement de paramètres d'URL (un filtre, un
 *  tiroir) reste dans la page. */
function memeChemin(
  courante: EmplacementRouteur,
  suivante: EmplacementRouteur
) {
  return courante.pathname === suivante.pathname
}

/**
 * Garde « modifications non enregistrées » d'une page, sans routeur : retient
 * la fermeture de l'onglet (`useUnsavedChangesWarning`), et rend le garde à
 * passer au routeur, qui dit s'il faut retenir une navigation. L'état de la
 * navigation retenue va ensuite à `UnsavedChangesDialog`.
 *
 * `modifie` : un booléen, ou une fonction lue au moment de naviguer ou de
 * quitter, pas au dernier rendu (un état changé dans le même geste que
 * l'adresse, ou tenu hors du rendu comme `nonEnregistre` de
 * `useDraftAutosave`). `resteDansLaPage` dit quelles navigations gardent la
 * saisie : par défaut, celles qui ne changent pas de chemin.
 *
 * Le garde rendu est stable : il lit `modifie` et `resteDansLaPage` du
 * dernier rendu.
 *
 * ```tsx
 * // react-router, routeur « data »
 * const blocage = useBlocker(useUnsavedChangesGuard(modifie))
 * <UnsavedChangesDialog blocage={blocage} />
 * ```
 */
export function useUnsavedChangesGuard<
  L extends EmplacementRouteur = EmplacementRouteur,
>(
  modifie: boolean | (() => boolean),
  resteDansLaPage: (courante: L, suivante: L) => boolean = memeChemin
): (navigation: NavigationDemandee<L>) => boolean {
  useUnsavedChangesWarning(modifie)
  const dernier = useRef({ modifie, resteDansLaPage })
  useEffect(() => {
    dernier.current = { modifie, resteDansLaPage }
  })
  return useCallback(
    ({ currentLocation, nextLocation }: NavigationDemandee<L>) => {
      const { modifie: lu, resteDansLaPage: reste } = dernier.current
      return (
        (typeof lu === "function" ? lu() : lu) &&
        !reste(currentLocation, nextLocation)
      )
    },
    []
  )
}
