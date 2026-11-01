import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

/**
 * Portée des préférences gardées dans le navigateur : l'identifiant de la
 * personne connectée. `localStorage` appartient au navigateur, pas au
 * compte : sans portée, deux personnes qui se succèdent sur un poste partagé
 * hériteraient l'une des réglages de l'autre.
 */
const ContextePortee = createContext<string | null>(null)

export interface PorteeStockageLocalProps {
  /** Identifiant de la personne connectée ; `null` avant la connexion. */
  portee: string | null | undefined
  children?: ReactNode
}

/**
 * Fournit la portée de `usePersistedState` et `useColumnPrefs` à toute
 * l'application, une fois, sous l'authentification :
 * `<PorteeStockageLocal portee={moi?.id}>`.
 */
export function PorteeStockageLocal({
  portee,
  children,
}: PorteeStockageLocalProps) {
  return createElement(ContextePortee, { value: portee ?? null }, children)
}

/** Clé réellement écrite : `<portée>:<clé>`, `anon` sans personne connue. */
export function cleStockageLocal(
  cle: string,
  portee: string | null | undefined
): string {
  return `${portee ?? "anon"}:${cle}`
}

/** La valeur enregistrée sous `cle`, si elle passe `accepter` (toute valeur
 *  sans garde) ; `defaut` sinon. */
function lire<T>(
  cle: string,
  defaut: T,
  accepter?: (valeur: unknown) => valeur is T
): T {
  try {
    const brute = localStorage.getItem(cle)
    if (brute === null) return defaut
    const valeur = JSON.parse(brute) as T
    return !accepter || accepter(valeur) ? valeur : defaut
  } catch {
    // JSON abîmé, stockage refusé (navigation privée…) : la valeur par défaut.
    return defaut
  }
}

export interface UsePersistedStateOptions<T> {
  /**
   * Garde de ce qui est relu : une valeur enregistrée survit au code qui l'a
   * écrite (un statut retiré du produit ne doit pas revenir comme filtre que
   * plus aucune option n'efface). Refusée, c'est la valeur par défaut.
   */
  accepter?: (valeur: unknown) => valeur is T
  /** Remplace la portée de `PorteeStockageLocal`. */
  portee?: string | null
}

/**
 * Un `useState` gardé dans `localStorage` : un réglage choisi une fois (un
 * filtre, une disposition) survit au rechargement et à la navigation.
 * Jamais pour des données, ni pour ce qu'un lien doit pouvoir transmettre
 * (l'URL s'en charge).
 *
 * La clé est préfixée par la portée (`PorteeStockageLocal`) : à la
 * connexion, ou à un changement de compte, la valeur de la nouvelle personne
 * est relue, dès le premier rendu, au lieu de reprendre la précédente. Rien
 * n'est écrit tant que la valeur n'a pas été choisie : la valeur par défaut
 * peut changer avec l'application.
 *
 * ```ts
 * const [statut, setStatut] = usePersistedState("membres:statut", "actif", {
 *   accepter: (v): v is Statut => STATUTS.includes(v as Statut),
 * })
 * ```
 */
export function usePersistedState<T>(
  cle: string,
  defaut: T,
  options: UsePersistedStateOptions<T> = {}
): readonly [T, (valeur: T | ((avant: T) => T)) => void] {
  const porteeContexte = useContext(ContextePortee)
  const portee = options.portee !== undefined ? options.portee : porteeContexte
  const cleComplete = cleStockageLocal(cle, portee)
  /** L'état relu sous une clé : rien de choisi encore. */
  const etatPour = (cleLue: string) => ({
    cle: cleLue,
    valeur: lire(cleLue, defaut, options.accepter),
    choisie: false,
  })

  const [etat, setEtat] = useState(() => etatPour(cleComplete))
  // Clé changée (connexion, autre compte, autre liste) : relue pendant le
  // rendu, pour que le premier affichage soit juste et que la valeur
  // précédente ne soit jamais écrite sous la nouvelle clé.
  let courant = etat
  if (etat.cle !== cleComplete) {
    courant = etatPour(cleComplete)
    setEtat(courant)
  }

  useEffect(() => {
    if (!etat.choisie) return
    try {
      localStorage.setItem(etat.cle, JSON.stringify(etat.valeur))
    } catch {
      // Quota atteint, navigation privée : le réglage vaut pour la session.
    }
  }, [etat])

  // Stable, comme le `setState` de React.
  const definir = useCallback(
    (valeur: T | ((avant: T) => T)) =>
      setEtat((avant) => ({
        ...avant,
        valeur:
          typeof valeur === "function"
            ? (valeur as (avant: T) => T)(avant.valeur)
            : valeur,
        choisie: true,
      })),
    []
  )

  return [courant.valeur, definir] as const
}
