import { useEffect, useState } from "react"

/**
 * La valeur, recopiée après `delai` millisecondes sans changement : une
 * recherche au clavier n'émet pas une requête par frappe, mais une par pause
 * (la recherche de `DataTableToolbar` laisse cette temporisation à
 * l'application).
 *
 * ```tsx
 * const [recherche, setRecherche] = useState("")
 * const rechercheDifferee = useDebouncedValue(recherche)
 * useQuery({ queryKey: ["membres", rechercheDifferee], … })
 * ```
 */
export function useDebouncedValue<T>(valeur: T, delai = 300): T {
  const [differee, setDifferee] = useState(valeur)
  useEffect(() => {
    const minuterie = setTimeout(() => setDifferee(valeur), delai)
    return () => clearTimeout(minuterie)
  }, [valeur, delai])
  return differee
}
