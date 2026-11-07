import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { useDebouncedValue } from "@etic-ui/hooks/use-debounced-value"

export interface UseDebouncedSearchOptions {
  /** Pause de frappe avant la recopie, en millisecondes (300 par défaut). */
  delai?: number
  /**
   * Un champ démonté avant la fin de la pause (panneau refermé) recopie
   * aussitôt la saisie en attente, au lieu de la perdre.
   */
  recopierAuDemontage?: boolean
}

/**
 * Champ de recherche dont la valeur vit ailleurs (l'URL, l'état d'une liste)
 * mais n'y est recopiée qu'après une pause de frappe, sans les espaces de
 * tête et de fin : la requête ne part pas à chaque caractère, et la saisie
 * reste fluide. Rend la saisie et son setter, comme un `useState`.
 *
 * Si la valeur change d'ailleurs (retour arrière, filtres réinitialisés), la
 * saisie suit ; si c'est la saisie qui vient d'être recopiée, rien ne bouge,
 * sans quoi une frappe rapide serait écrasée par la valeur recopiée 300 ms
 * plus tôt.
 *
 * ```tsx
 * const [saisie, setSaisie] = useDebouncedSearch(
 *   params.get("recherche") ?? "",
 *   (valeur) => definirFiltre("recherche", valeur)
 * )
 * <DataTableToolbar recherche={{ valeur: saisie, onValeurChange: setSaisie }} />
 * ```
 */
export function useDebouncedSearch(
  valeur: string,
  onValeurChange: (valeur: string) => void,
  { delai, recopierAuDemontage = false }: UseDebouncedSearchOptions = {}
) {
  const [saisie, setSaisie] = useState(valeur)
  const differee = useDebouncedValue(saisie.trim(), delai)

  const [derniere, setDerniere] = useState(valeur)
  if (valeur !== derniere) {
    setDerniere(valeur)
    if (valeur !== differee) setSaisie(valeur)
  }

  // L'effet ne dépend que de la valeur différée : y ajouter `valeur` le
  // rejouerait quand elle change d'ailleurs, et il y recopierait la saisie
  // périmée. Il lit donc `valeur` et `onValeurChange` du dernier rendu.
  const contexte = useRef({ valeur, onValeurChange, saisie: saisie.trim() })
  useLayoutEffect(() => {
    contexte.current = { valeur, onValeurChange, saisie: saisie.trim() }
  })
  useEffect(() => {
    if (differee !== contexte.current.valeur)
      contexte.current.onValeurChange(differee)
  }, [differee])
  useEffect(() => {
    if (!recopierAuDemontage) return
    return () => {
      const dernier = contexte.current
      if (dernier.saisie !== dernier.valeur)
        dernier.onValeurChange(dernier.saisie)
    }
  }, [recopierAuDemontage])

  return [saisie, setSaisie] as const
}
