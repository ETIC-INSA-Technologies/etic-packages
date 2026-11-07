import { useMemo } from "react"
import {
  functionalUpdate,
  type ColumnOrderState,
  type ColumnVisibilityState,
  type OnChangeFn,
} from "@tanstack/react-table"

import { useIsMobile } from "@etic-ui/hooks/use-mobile"
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
   * Colonnes offertes ici, parmi `colonnes` (droit manquant, donnée non
   * servie, colonne qui ne dirait rien dans cette vue) ; toutes par défaut.
   * Les autres sont masquées, hors du panneau « Colonnes », et gardent leur
   * état et leur place dans les préférences : elles réapparaissent telles
   * quelles quand elles redeviennent disponibles.
   */
  disponibles?: readonly string[]
  /**
   * Colonnes que la vue impose à l'écran, quelles que soient les
   * préférences (un filtre posé sur leur donnée montre sa colonne). Elles
   * sortent du panneau « Colonnes » le temps de l'imposition, et leur
   * préférence reste intacte.
   */
  affichees?: readonly string[]
  /**
   * Sur téléphone (`useIsMobile`), les seules colonnes réglables affichées :
   * un tableau qui défile de côté couperait sans le dire la colonne utile.
   * Les préférences restent intactes, et le panneau « Colonnes », sans objet,
   * disparaît (`colonnesReglables` vide). Sans elle, rien ne change sur
   * téléphone.
   */
  mobile?: readonly string[]
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
  /** Les seules colonnes que « Colonnes » peut masquer et déplacer : les
   *  disponibles, ni fixes en tête, ni imposées (`affichees`), ni absentes
   *  de `colonnes` ; aucune sur téléphone avec `mobile`. */
  colonnesReglables: readonly string[]
}

export interface ColumnPrefsResultat {
  /** Ordre de toutes les colonnes réglables. */
  ordre: string[]
  /** Colonnes affichées selon les préférences (disponibles ou non) ; ce qui
   *  est à l'écran : `optionsTableau.visibiliteColonnes`. */
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
  const ordre = ordonner(Array.isArray(order) ? order : [], colonnes)
  // Après les colonnes citées, `ordonner` met celles que l'enregistrement
  // ne connaissait pas : les colonnes apparues depuis.
  const ajoutees = ordre.slice(connues(order, colonnes).length)
  return {
    order: ordre,
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
 *  son ordre : la partie citée d'`ordonner`, seule règle de nettoyage. */
function connues(valeur: unknown, colonnes: readonly string[]): string[] {
  if (!Array.isArray(valeur)) return []
  const citees = new Set(valeur)
  return ordonner(valeur, colonnes).filter((id) => citees.has(id))
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
  affichees: afficheesDonnees = [],
  mobile: mobileDonnees,
  fixesEnTete: fixesDonnees = [],
  portee,
}: UseColumnPrefsOptions): ColumnPrefsResultat {
  const colonnes = useListeStable(colonnesDonnees)
  const visiblesParDefaut = useListeStable(visiblesDonnees)
  const disponibles = useListeStable(disponiblesDonnees ?? colonnesDonnees)
  const affichees = useListeStable(afficheesDonnees)
  const gardeesMobile = useListeStable(mobileDonnees ?? [])
  const fixesEnTete = useListeStable(fixesDonnees)
  const restreint = useIsMobile() && mobileDonnees !== undefined

  const [brute, setBrute] = usePersistedState<unknown>(cle, null, { portee })

  return useMemo(() => {
    const prefs = lirePreferencesColonnes(brute, colonnes, visiblesParDefaut)
    // Disponibles ici, connues des préférences, pas fixes en tête : celles
    // dont les préférences règlent l'affichage.
    const reglables = disponibles.filter(
      (id) => colonnes.includes(id) && !fixesEnTete.includes(id)
    )
    const estDisponible = (id: string) => reglables.includes(id)
    // Indisponibles : masquées, sans quoi TanStack affiche une colonne que
    // la visibilité ne cite pas.
    const indisponibles = colonnes.filter(
      (id) => !estDisponible(id) && !fixesEnTete.includes(id)
    )
    const imposeesVisibles = affichees.filter(estDisponible)
    const imposeesMasquees = restreint
      ? reglables.filter(
          (id) => !gardeesMobile.includes(id) && !affichees.includes(id)
        )
      : []
    const imposees = new Set([...imposeesVisibles, ...imposeesMasquees])
    // Toujours à partir de la valeur enregistrée la plus récente.
    const modifier = (maj: (avant: ColumnPrefs) => ColumnPrefs) =>
      setBrute((avant: unknown) =>
        maj(lirePreferencesColonnes(avant, colonnes, visiblesParDefaut))
      )
    const visibiliteDe = (p: ColumnPrefs): ColumnVisibilityState =>
      Object.fromEntries(reglables.map((id) => [id, p.visible.includes(id)]))
    const visibiliteAffichee: ColumnVisibilityState = {
      ...Object.fromEntries(indisponibles.map((id) => [id, false])),
      ...visibiliteDe(prefs),
      ...Object.fromEntries(imposeesMasquees.map((id) => [id, false])),
      ...Object.fromEntries(imposeesVisibles.map((id) => [id, true])),
    }
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
        visibiliteColonnes: visibiliteAffichee,
        // Les colonnes non disponibles gardent leur état, les colonnes
        // imposées leur préférence : un geste parti de l'état affiché ne la
        // change pas.
        onVisibiliteColonnesChange: (maj) =>
          modifier((p) => {
            const avant = visibiliteDe(p)
            const suivante = functionalUpdate(maj, avant)
            const garder = (id: string) =>
              imposees.has(id) ? avant[id] : suivante[id] !== false
            return {
              ...p,
              visible: [
                ...p.visible.filter((id) => !estDisponible(id)),
                ...reglables.filter(garder),
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
        colonnesReglables: restreint
          ? []
          : reglables.filter((id) => !imposees.has(id)),
      },
    }
  }, [
    brute,
    setBrute,
    colonnes,
    visiblesParDefaut,
    disponibles,
    affichees,
    gardeesMobile,
    restreint,
    fixesEnTete,
  ])
}
