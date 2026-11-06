import { createContext, useContext, useMemo, type ReactNode } from "react"
import { cn } from "cn"
import { CircleAlertIcon, RotateCwIcon } from "lucide-react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@etic-ui/components/ui/alert"
import { Button } from "@etic-ui/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
} from "@etic-ui/components/ui/collapsible"
import { DisclosureTrigger } from "@etic-ui/components/etic/disclosure"

export interface ErrorBannerProps {
  /**
   * L'erreur à afficher ; rien n'est rendu si elle est absente (`null`,
   * `undefined`, `false`). Lue sans rien connaître de l'application : son
   * `message` (une `Error`, ou tout objet qui en a un, ou une chaîne), son
   * `code` s'il est textuel, et son `details` s'il n'est pas vide.
   */
  erreur: unknown
  /** Remplace le message lu dans l'erreur. */
  titre?: ReactNode
  /** Phrase sous le message : ce que la personne peut faire. */
  description?: ReactNode
  /** Détail technique, replié sous « Détails ». Remplace `details` de l'erreur. */
  detail?: unknown
  /** Affiche « Réessayer », qui appelle cette fonction. */
  onReessayer?: () => void
  /** Nouvelle tentative en cours : « Réessayer » est occupé (roue,
   *  `aria-busy`) et ignore les clics, sans perdre le focus. */
  enCours?: boolean
  className?: string
}

/** Ce qu'un bandeau affiche d'une erreur : son message, son code, son détail
 *  technique (replié). */
export interface ErreurDecrite {
  message: string
  code?: string
  detail?: unknown
}

/** Message, code et détail d'une erreur de forme inconnue : son `message`
 *  (un repli qui dit quoi faire s'il manque), son `code` s'il est textuel,
 *  son `details`. */
export function decrireErreur(erreur: unknown): ErreurDecrite {
  if (typeof erreur === "string") return { message: erreur }
  if (typeof erreur === "object" && erreur !== null) {
    const { message, code, details } = erreur as Record<string, unknown>
    return {
      message:
        typeof message === "string" && message
          ? message
          : "Une erreur s'est produite. Réessayez ; si elle persiste, prévenez l'équipe technique.",
      code: typeof code === "string" && code ? code : undefined,
      detail: details,
    }
  }
  return { message: String(erreur) }
}

interface AffichageErreurs {
  masquerCode: boolean
  decrire: (erreur: unknown) => ErreurDecrite
}

const ContexteAffichageErreurs = createContext<AffichageErreurs>({
  masquerCode: false,
  decrire: decrireErreur,
})

export interface ErrorBannerProviderProps {
  /** N'affiche jamais le code de l'erreur devant son message : le code
   *  machine (`not_found`…) ne parle qu'aux développeurs. Faux par défaut. */
  masquerCode?: boolean
  /**
   * Lecture d'une erreur, à la place de `decrireErreur` : règle propre à
   * l'application (un détail à taire pour certaines erreurs…). Repartir de
   * `decrireErreur(erreur)` et n'en changer que ce qu'il faut. Une
   * référence stable, définie au niveau du module. `masquerCode`
   * s'applique au résultat.
   */
  decrire?: (erreur: unknown) => ErreurDecrite
  children: ReactNode
}

/**
 * Règle l'affichage des erreurs, une fois, autour de l'application : tous
 * les bandeaux de la bibliothèque la suivent (`ErrorBanner`,
 * `QueryErrorBanner`, `QueryBoundary`, le bandeau de `DataTable`, l'erreur
 * de `ConfirmDialog`, de `FormDialog` et de `DraftResumeDialog`). Sans lui,
 * le code s'affiche devant le message.
 */
export function ErrorBannerProvider({
  masquerCode = false,
  decrire = decrireErreur,
  children,
}: ErrorBannerProviderProps) {
  const valeur = useMemo(
    () => ({ masquerCode, decrire }),
    [masquerCode, decrire]
  )
  return (
    <ContexteAffichageErreurs.Provider value={valeur}>
      {children}
    </ContexteAffichageErreurs.Provider>
  )
}

function estVide(detail: unknown) {
  if (detail === null || detail === undefined || detail === "") return true
  if (typeof detail === "object") return Object.keys(detail).length === 0
  return false
}

/**
 * Texte d'un détail technique. Ne lève jamais : un objet circulaire ou un
 * `BigInt` ferait planter `JSON.stringify`, et le bandeau d'erreur avec lui.
 */
export function texteDuDetail(detail: unknown): string {
  if (typeof detail === "string") return detail
  const vus = new WeakSet<object>()
  try {
    return JSON.stringify(
      detail,
      (_cle, valeur: unknown) => {
        if (typeof valeur === "bigint") return `${valeur}n`
        if (typeof valeur === "object" && valeur !== null) {
          if (vus.has(valeur)) return "[référence circulaire]"
          vus.add(valeur)
        }
        return valeur
      },
      2
    )
  } catch {
    return String(detail)
  }
}

/** Bloc repliable d'un détail technique, fermé par défaut. */
export function DetailTechnique({
  libelle = "Détails",
  detail,
}: {
  libelle?: string
  detail: unknown
}) {
  return (
    <Collapsible className="mt-1">
      <DisclosureTrigger variante="lien" taille="xs" className="text-current">
        {libelle}
      </DisclosureTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-foreground">
          {texteDuDetail(detail)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

export interface BoutonReessayerProps {
  onClick: () => void
  /** Nouvelle tentative en cours : occupé, mais focalisable. */
  enCours?: boolean
  /** `sm` par défaut, comme dans un bandeau ; `default` dans l'en-tête
   *  d'une section, à côté de boutons ordinaires. */
  size?: "sm" | "default"
}

/** « Réessayer » d'un bandeau ou d'un repli d'erreur, et hors bandeau (une
 *  ligne d'état, une phrase) : même allure partout, occupé mais focalisable
 *  pendant la nouvelle tentative. */
export function BoutonReessayer({
  onClick,
  enCours = false,
  size = "sm",
}: BoutonReessayerProps) {
  return (
    <Button variant="outline" size={size} enCours={enCours} onClick={onClick}>
      <RotateCwIcon data-icon="inline-start" />
      Réessayer
    </Button>
  )
}

/**
 * Bandeau d'erreur : le message en évidence, le code s'il y en a un (sauf
 * sous un `ErrorBannerProvider` qui le masque), le détail technique replié
 * sous « Détails », et « Réessayer » si l'action peut être relancée. Sur le
 * modèle de l'`Alert` destructive de shadcn.
 */
export function ErrorBanner({
  erreur,
  titre,
  description,
  detail,
  onReessayer,
  enCours = false,
  className,
}: ErrorBannerProps) {
  const { masquerCode, decrire } = useContext(ContexteAffichageErreurs)
  if (erreur === null || erreur === undefined || erreur === false) return null
  const lu = decrire(erreur)
  const code = masquerCode ? undefined : lu.code
  const detailAffiche = detail === undefined ? lu.detail : detail

  return (
    <Alert
      variant="destructive"
      className={cn(
        // Colonne du texte bornée (`minmax(0,1fr)` et non `1fr`, dont le
        // minimum est le mot le plus long) : une chaîne sans espace (adresse,
        // identifiant) se coupe au lieu d'élargir la colonne et de passer
        // sous « Réessayer ».
        "has-[>svg]:grid-cols-[auto_minmax(0,1fr)] *:data-[slot=alert-description]:wrap-break-word *:data-[slot=alert-title]:wrap-break-word",
        // « Réessayer » (bouton `sm`, 28 px) centré sur la première ligne du
        // titre, 6 px au-dessus et au-dessous : sans quoi, sous un titre d'une
        // ligne, il touche le bas du bandeau.
        onReessayer &&
          "has-data-[slot=alert-action]:py-2.5 has-data-[slot=alert-action]:pr-32",
        className
      )}
    >
      <CircleAlertIcon />
      <AlertTitle>
        {titre ?? (
          <>
            {code ? <span className="font-mono">{code}&nbsp;: </span> : null}
            {lu.message}
          </>
        )}
      </AlertTitle>
      {description || !estVide(detailAffiche) ? (
        <AlertDescription>
          {description}
          {!estVide(detailAffiche) ? (
            <DetailTechnique detail={detailAffiche} />
          ) : null}
        </AlertDescription>
      ) : null}
      {onReessayer ? (
        <AlertAction className="top-1.5">
          <BoutonReessayer onClick={onReessayer} enCours={enCours} />
        </AlertAction>
      ) : null}
    </Alert>
  )
}
