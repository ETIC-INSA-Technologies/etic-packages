import { cn } from "cn"

export interface CodeBlockProps {
  /** Un texte, rendu tel quel ; toute autre valeur, en JSON indenté. */
  valeur: unknown
  /** Lignes longues coupées au lieu de défiler de côté (message, trace lus
   *  sur téléphone). */
  retourLigne?: boolean
  /** Classes du bloc : sa hauteur maximale (`max-h-80`), au-delà de laquelle
   *  il défile. */
  className?: string
}

/**
 * Une donnée technique telle quelle (contexte enregistré, trace, réponse
 * d'un service), en police à chasse fixe, dans un bloc qui défile.
 */
export function CodeBlock({
  valeur,
  retourLigne = false,
  className,
}: CodeBlockProps) {
  return (
    <pre
      data-slot="code-block"
      className={cn(
        "min-w-0 overflow-auto rounded-md bg-muted p-3 font-mono text-xs",
        retourLigne && "break-words whitespace-pre-wrap",
        className
      )}
    >
      {texteDe(valeur)}
    </pre>
  )
}

/** Le texte du bloc : JSON indenté, sinon (`undefined`, fonction, `BigInt`,
 *  objet circulaire, que `JSON.stringify` omet ou refuse) `String`. */
function texteDe(valeur: unknown): string {
  if (typeof valeur === "string") return valeur
  try {
    const json = JSON.stringify(valeur, null, 2) as string | undefined
    if (json !== undefined) return json
  } catch {
    // Circulaire ou `BigInt` : le texte brut ci-dessous.
  }
  return String(valeur)
}
