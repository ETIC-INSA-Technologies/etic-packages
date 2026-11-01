import { useMemo } from "react"
import {
  functionalUpdate,
  type ColumnOrderState,
  type ColumnVisibilityState,
  type OnChangeFn,
} from "@tanstack/react-table"

import { usePersistedState } from "@etic-ui/hooks/use-persisted-state"
import { ordonner, replacer } from "@etic-ui/lib/ordre-colonnes"

/**
 * Préférences de colonnes enregistrées : l'ordre de toutes les colonnes
 * réglables et celles qui sont affichées. Noms anglais gardés : c'est le
 * format déjà écrit dans les navigateurs par ETIC Members.
 */
export interface ColumnPrefs {
  order: string[]
  visible: string[]
}

export interface UseColumnPrefsOptions {
  /** Clé de la liste, préfixée par la portée (`PorteeStockageLocal`) :
   *  « membres:actifs ». Une nouvelle clé repart des valeurs par défaut. */
  cle: string
  /** Toutes les colonnes réglables, dans leur ordre par défaut. */
  colonnes: readonly string[]
  /** Colonnes affichées tant que la personne n'a rien choisi. */
  visiblesParDefaut: readonly string[]
  /**
   * Colonnes offertes ici, parmi `colonnes` (droit manquant, type de
   * compte…) ; toutes par défaut. Les autres gardent leur état et leur place
   * dans les préférences, et réapparaissent telles quelles quand elles
   * redeviennent disponibles.
   */
  disponibles?: readonly string[]
  /** Colonnes toujours en tête du tableau, hors préférences (sélection,
   *  nom…). */
  fixesEnTete?: readonly string[]
  /** Remplace la portée de `PorteeStockageLocal`. */
  portee?: string | null
}

/** Les options de `useDataTable` (et de `DataTableViewOptions` sans
 *  `table`) qui règlent visibilité et ordre des colonnes. */
export interface ColumnPrefsOptionsTableau {
  visibiliteColonnes: ColumnVisibilityState
  onVisibiliteColonnesChange: OnChangeFn<ColumnVisibilityState>
  ordreColonnes: ColumnOrderState
  onOrdreColonnesChange: OnChangeFn<ColumnOrderState>
}

export interface ColumnPrefsResultat {
  /** Ordre de toutes les colonnes réglables. */
  ordre: string[]
  /** Colonnes affichées. */
  visibles: string[]
  /** Affiche une colonne masquée, ou l'inverse. */
  basculer: (id: string) => void
  /** Revient aux colonnes et à l'ordre par défaut. */
  reinitialiser: () => void
  /** À étaler dans `useDataTable` (ou `DataTableViewOptions`) : visibilité
   *  et ordre des colonnes disponibles, colonnes fixes en tête. Stable tant
   *  que les préférences ne changent pas. */
  optionsTableau: ColumnPrefsOptionsTableau
}

/**
 * Préférences lues, remises en forme pour les colonnes d'aujourd'hui :
 * colonnes inconnues retirées ; ancien format (simple liste des colonnes
 * affichées) repris ; colonnes apparues depuis l'enregistrement ajoutées à
 * la fin, et affichées si elles le sont par défaut (l'enregistrement, plus
 * ancien qu'elles, n'a pas pu les masquer exprès).
 */
export function lirePreferencesColonnes(
  brute: unknown,
  colonnes: readonly string[],
  visiblesParDefaut: readonly string[]
): ColumnPrefs {
  const visiblesDefaut = connues(visiblesParDefaut, colonnes)
  // Ancien format : la liste des colonnes affichées, sans ordre.
  if (Array.isArray(brute))
    return { order: [...colonnes], visible: connues(brute, colonnes) }
  if (!brute || typeof brute !== "object")
    return { order: [...colonnes], visible: visiblesDefaut }
  const { order, visible } = brute as { order?: unknown; visible?: unknown }
  const citees = new Set(connues(order, colonnes))
  const ajoutees = colonnes.filter((id) => !citees.has(id))
  return {
    order: ordonner(Array.isArray(order) ? order : [], colonnes),
    visible:
      visible === undefined
        ? visiblesDefaut
        : connues(
            [
              ...(Array.isArray(visible) ? visible : []),
              ...ajoutees.filter((id) => visiblesParDefaut.includes(id)),
            ],
            colonnes
          ),
  }
}

/** Les identifiants connus d'une liste lue (stockage), sans doublon, dans
 *  son ordre. */
function connues(valeur: unknown, colonnes: readonly string[]): string[] {
  if (!Array.isArray(valeur)) return []
  return [
    ...new Set(
      valeur.filter(
        (id): id is string => typeof id === "string" && colonnes.includes(id)
      )
    ),
  ]
}

/** Liste stable tant que son contenu ne change pas (tableaux écrits en
 *  ligne par l'application). */
function useListeStable(liste: readonly string[]): readonly string[] {
  const cle = liste.join("\u0000")
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `cle` résume `liste`.
  return useMemo(() => liste, [cle])
}

/**
 * Colonnes affichées et leur ordre, gardés dans le navigateur pour chaque
 * liste et chaque personne (portée de `PorteeStockageLocal`), branchés sur
 * le sélecteur de colonnes d'un `DataTable` :
 *
 * ```tsx
 * const prefs = useColumnPrefs({
 *   cle: "membres:actifs",
 *   colonnes: ["email", "statut", "telephone"],
 *   visiblesParDefaut: ["email", "statut"],
 *   fixesEnTete: ["select", "nom"],
 * })
 * const table = useDataTable({ donnees, colonnes: COLONNES, idLigne,
 *   ...prefs.optionsTableau })
 * ```
 *
 * Pour un tableau rendu à la main : `ordre`, `visibles` et `basculer`, et
 * `<DataTableViewOptions colonnes={…} {...prefs.optionsTableau} />`.
 */
export function useColumnPrefs({
  cle,
  colonnes: colonnesDonnees,
  visiblesParDefaut: visiblesDonnees,
  disponibles: disponiblesDonnees,
  fixesEnTete: fixesDonnees = [],
  portee,
}: UseColumnPrefsOptions): ColumnPrefsResultat {
  const colonnes = useListeStable(colonnesDonnees)
  const visiblesParDefaut = useListeStable(visiblesDonnees)
  const disponibles = useListeStable(disponiblesDonnees ?? colonnesDonnees)
  const fixesEnTete = useListeStable(fixesDonnees)

  const [brute, setBrute] = usePersistedState<unknown>(cle, null, { portee })

  return useMemo(() => {
    const prefs = lirePreferencesColonnes(brute, colonnes, visiblesParDefaut)
    const estDisponible = (id: string) => disponibles.includes(id)
    // Toujours à partir de la valeur enregistrée la plus récente.
    const modifier = (maj: (avant: ColumnPrefs) => ColumnPrefs) =>
      setBrute((avant: unknown) =>
        maj(lirePreferencesColonnes(avant, colonnes, visiblesParDefaut))
      )
    const visibiliteDe = (p: ColumnPrefs): ColumnVisibilityState =>
      Object.fromEntries(disponibles.map((id) => [id, p.visible.includes(id)]))
    const ordreDe = (p: ColumnPrefs): ColumnOrderState => [
      ...fixesEnTete,
      ...p.order.filter(estDisponible),
    ]

    return {
      ordre: prefs.order,
      visibles: prefs.visible,
      basculer: (id) =>
        modifier((p) => ({
          ...p,
          visible: p.visible.includes(id)
            ? p.visible.filter((v) => v !== id)
            : [...p.visible, id],
        })),
      // `null` plutôt que les valeurs par défaut d'aujourd'hui : celles de
      // demain s'appliqueront aussi.
      reinitialiser: () => setBrute(null),
      optionsTableau: {
        visibiliteColonnes: visibiliteDe(prefs),
        // Les colonnes non disponibles gardent leur état.
        onVisibiliteColonnesChange: (maj) =>
          modifier((p) => {
            const suivante = functionalUpdate(maj, visibiliteDe(p))
            return {
              ...p,
              visible: [
                ...p.visible.filter((id) => !estDisponible(id)),
                ...disponibles.filter((id) => suivante[id] !== false),
              ],
            }
          }),
        ordreColonnes: ordreDe(prefs),
        // Seules les colonnes disponibles changent de place ; les fixes et
        // celles hors préférences sont ignorées.
        onOrdreColonnesChange: (maj) =>
          modifier((p) => ({
            ...p,
            order: replacer(
              p.order,
              estDisponible,
              functionalUpdate(maj, ordreDe(p))
            ),
          })),
      },
    }
  }, [brute, setBrute, colonnes, visiblesParDefaut, disponibles, fixesEnTete])
}
