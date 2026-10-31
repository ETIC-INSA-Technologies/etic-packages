import { useSyncExternalStore } from "react"

/**
 * Seuil de l'affichage mobile de toute la suite : téléphones et tablettes, en
 * portrait comme en paysage (1 024 px compris). La barre latérale y devient un
 * tiroir. shadcn le place à 768 px ; une tablette en paysage y garderait une
 * colonne qui mange un quart de la largeur, trop pour les tableaux.
 *
 * Le CSS de la barre latérale emploie la même frontière (variante
 * `min-[1025px]:`) : les deux se changent ensemble. Écrite `width < 1025px`
 * et non `max-width: 1024px`, pour que les largeurs fractionnaires d'un zoom
 * (1 024,5 px) ne tombent entre les deux, sans colonne ni barre du haut.
 */
export const MOBILE_MEDIA_QUERY = "(width < 1025px)"

function mediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null
  return window.matchMedia(MOBILE_MEDIA_QUERY)
}

function abonner(changement: () => void) {
  const mql = mediaQuery()
  mql?.addEventListener("change", changement)
  return () => mql?.removeEventListener("change", changement)
}

/**
 * Vrai sous le seuil mobile, dès le premier rendu (pas d'aller-retour par un
 * effet, donc pas d'éclair de la mise en page de bureau). Hors navigateur :
 * faux, l'affichage de bureau.
 */
export function useIsMobile() {
  return useSyncExternalStore(
    abonner,
    () => mediaQuery()?.matches ?? false,
    () => false
  )
}
