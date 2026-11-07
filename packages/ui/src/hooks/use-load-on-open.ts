import { useCallback, useEffect, useLayoutEffect, useRef } from "react"

/** Une lecture qui se lance et s'oublie : la forme d'une mutation de
 *  TanStack Query (`useMutation`), sans en dépendre. */
export interface LectureAOuverture {
  mutate: () => void
  reset: () => void
}

/**
 * Lance une lecture à chaque ouverture d'un dialogue (des données qui ont
 * pu changer ailleurs depuis la dernière fois), et l'oublie à sa fermeture :
 * la prochaine ouverture ne montre pas, le temps d'un rendu, la réponse
 * précédente. Rend la relecture, stable, pour « Réessayer ».
 *
 * Seul `ouvert` relance la lecture : `mutate` et `reset` peuvent être écrits
 * en ligne (`mutate: () => lecture.mutate(id)`), ceux du dernier rendu
 * servent.
 *
 * ```tsx
 * const lecture = useMutation({ mutationFn: lireTaux })
 * const relire = useLoadOnOpen(lecture, ouvert)
 * <QueryErrorBanner requete={…} /> // ou ErrorBanner onReessayer={relire}
 * ```
 */
export function useLoadOnOpen(
  lecture: LectureAOuverture,
  ouvert: boolean
): () => void {
  const { mutate, reset } = lecture
  const dernierRendu = useRef({ mutate, reset })
  useLayoutEffect(() => {
    dernierRendu.current = { mutate, reset }
  })
  const relire = useCallback(() => dernierRendu.current.mutate(), [])
  useEffect(() => {
    if (!ouvert) return
    relire()
    return () => dernierRendu.current.reset()
  }, [ouvert, relire])
  return relire
}
