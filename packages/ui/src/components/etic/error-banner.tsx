import type { ReactNode } from "react"
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

/** Message, code et détail d'une erreur de forme inconnue. */
export function decrireErreur(erreur: unknown): {
  message: string
  code?: string
  detail?: unknown
} {
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

/** « Réessayer » d'un bandeau ou d'un repli d'erreur : même taille partout,
 *  occupé mais focalisable pendant la nouvelle tentative. */
export function BoutonReessayer({
  onClick,
  enCours = false,
}: {
  onClick: () => void
  enCours?: boolean
}) {
  return (
    <Button variant="outline" size="sm" enCours={enCours} onClick={onClick}>
      <RotateCwIcon data-icon="inline-start" />
      Réessayer
    </Button>
  )
}

/**
 * Bandeau d'erreur : le message en évidence, le code s'il y en a un, le
 * détail technique replié sous « Détails », et « Réessayer » si l'action peut
 * être relancée. Sur le modèle de l'`Alert` destructive de shadcn.
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
  if (erreur === null || erreur === undefined || erreur === false) return null
  const lu = decrireErreur(erreur)
  const detailAffiche = detail === undefined ? lu.detail : detail

  return (
    <Alert
      variant="destructive"
      className={cn(
        onReessayer && "has-data-[slot=alert-action]:pr-32",
        className
      )}
    >
      <CircleAlertIcon />
      <AlertTitle>
        {titre ?? (
          <>
            {lu.code ? (
              <span className="font-mono">{lu.code}&nbsp;: </span>
            ) : null}
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
        <AlertAction>
          <BoutonReessayer onClick={onReessayer} enCours={enCours} />
        </AlertAction>
      ) : null}
    </Alert>
  )
}
