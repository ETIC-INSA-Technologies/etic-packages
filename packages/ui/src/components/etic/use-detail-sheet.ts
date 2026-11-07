import { useCallback, useLayoutEffect, useRef, useState } from "react"

export interface UseDetailSheetOptions<T> {
  /**
   * Identifiant de l'élément demandé (un paramètre d'URL, `?document=12`) ;
   * `null` : tiroir fermé.
   */
  id: string | null
  /** Éléments chargés (la page affichée de la liste). */
  elements: readonly T[] | undefined
  /** Identifiant d'un élément, comparé à `id`. */
  idElement: (element: T) => string
  /**
   * La liste se charge encore : un élément absent est en attente
   * (`undefined`), pas introuvable. Faux une fois la liste arrivée ou en
   * échec (`isPending` de TanStack Query).
   */
  enChargement: boolean
  /** Pose ou retire l'identifiant (`null`). */
  onIdChange: (id: string | null) => void
}

export interface UseDetailSheetResultat<T> {
  /** Un identifiant est demandé. */
  ouvert: boolean
  /** L'élément à afficher (`element` de `DetailSheet`) : `undefined` en
   *  attente, `null` introuvable. */
  element: T | null | undefined
  /** Ouvre le tiroir sur cet élément. Stable, comme `fermer` et
   *  `onOuvertChange`. */
  ouvrir: (element: T) => void
  fermer: () => void
  /** Pour `onOuvertChange` du tiroir : seule la fermeture agit. */
  onOuvertChange: (ouvert: boolean) => void
}

/**
 * Le tiroir de détail d'une liste, piloté par un identifiant gardé ailleurs
 * (l'URL, le plus souvent : un lien ouvre le tiroir, le retour arrière le
 * ferme). L'élément affiché est celui de la liste chargée, ou le dernier
 * ouvert : un tri, un filtre ou une action qui le fait sortir de la liste
 * ne referme pas le tiroir. Un identifiant absent de la liste arrivée (lien
 * abîmé, élément supprimé, liste en échec) rend `null` : le tiroir s'ouvre
 * sur « introuvable », avec de quoi le fermer, au lieu d'être ignoré en
 * silence.
 *
 * ```tsx
 * const [params, setParams] = useSearchParams()
 * const tiroir = useDetailSheet({
 *   id: params.get("document"),
 *   elements: requete.data?.items,
 *   idElement: (d) => String(d.id),
 *   enChargement: requete.isPending,
 *   onIdChange: definirDocument,
 * })
 * <DetailSheet element={tiroir.element} ouvert={tiroir.ouvert}
 *   onOuvertChange={tiroir.onOuvertChange} introuvable={…}>
 *   {(document) => …}
 * </DetailSheet>
 * ```
 */
export function useDetailSheet<T>({
  id,
  elements,
  idElement,
  enChargement,
  onIdChange,
}: UseDetailSheetOptions<T>): UseDetailSheetResultat<T> {
  const [dernier, setDernier] = useState<T | null>(null)
  const dansLaListe =
    id === null
      ? undefined
      : elements?.find((element) => idElement(element) === id)
  // Retenu dès qu'il paraît dans la liste, même ouvert par un lien : il reste
  // affiché, en repli, quand la liste ne le contient plus. Retenu par son
  // identifiant, pas par sa référence : des éléments recréés à chaque rendu
  // (`items.map(…)` en ligne) ne relancent pas le rendu sans fin. Tant qu'il
  // est dans la liste, c'est la version de la liste qui s'affiche.
  const dernierId = dernier === null ? null : idElement(dernier)
  if (dansLaListe !== undefined && dernierId !== id) setDernier(dansLaListe)

  let element: T | null | undefined
  if (id !== null) {
    element =
      dansLaListe ??
      (dernier !== null && dernierId === id ? dernier : undefined) ??
      (enChargement ? undefined : null)
  }

  // Les fonctions rendues sont stables même si l'application écrit
  // `idElement` ou `onIdChange` en ligne : elles lisent ceux du dernier rendu.
  const dernierRendu = useRef({ idElement, onIdChange })
  useLayoutEffect(() => {
    dernierRendu.current = { idElement, onIdChange }
  })
  const ouvrir = useCallback((choisi: T) => {
    setDernier(choisi)
    const { idElement, onIdChange } = dernierRendu.current
    onIdChange(idElement(choisi))
  }, [])
  const fermer = useCallback(() => dernierRendu.current.onIdChange(null), [])
  const onOuvertChange = useCallback(
    (ouvert: boolean) => {
      if (!ouvert) fermer()
    },
    [fermer]
  )

  return { ouvert: id !== null, element, ouvrir, fermer, onOuvertChange }
}
