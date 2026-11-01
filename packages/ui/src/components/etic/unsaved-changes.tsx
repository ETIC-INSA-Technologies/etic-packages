import type { ReactNode } from "react"

import { ConfirmDialog } from "@etic-ui/components/etic/confirm-dialog"

/**
 * Navigation retenue par le routeur de l'application. Même forme que le
 * `Blocker` de react-router (`useBlocker`), qui se passe tel quel ; un autre
 * routeur fournit `state`, `proceed` et `reset` de la même façon.
 */
export interface UnsavedChangesBlocage {
  /** « blocked » tant qu'une navigation attend la réponse. */
  state: "blocked" | "unblocked" | "proceeding"
  /** Laisse partir la navigation retenue. */
  proceed?: () => void
  /** L'abandonne : la page reste affichée. */
  reset?: () => void
}

export interface UnsavedChangesDialogProps {
  blocage: UnsavedChangesBlocage
  /** « Modifications non enregistrées » par défaut. */
  titre?: string
  /** Ce qui sera perdu ; une phrase générale par défaut. */
  description?: ReactNode
  /** « Quitter sans enregistrer » par défaut. */
  libelleQuitter?: string
  /** « Rester sur la page » par défaut. */
  libelleRester?: string
}

/**
 * Confirmation d'une navigation qui perdrait des modifications : ouverte
 * tant que `blocage.state` vaut « blocked » ; « Quitter sans enregistrer »
 * laisse partir la navigation, « Rester sur la page » ou Échap
 * l'abandonnent. La bibliothèque n'importe aucun routeur : l'application
 * retient la navigation (`useBlocker` de react-router) et passe son état.
 * La fermeture de l'onglet relève de `useUnsavedChangesWarning`.
 *
 * ```tsx
 * useUnsavedChangesWarning(modifie)
 * const blocage = useBlocker(({ currentLocation, nextLocation }) =>
 *   modifie && currentLocation.pathname !== nextLocation.pathname)
 * <UnsavedChangesDialog blocage={blocage} />
 * ```
 */
export function UnsavedChangesDialog({
  blocage,
  titre = "Modifications non enregistrées",
  description = "Les modifications ne sont pas enregistrées. Si vous quittez la page, elles seront perdues.",
  libelleQuitter = "Quitter sans enregistrer",
  libelleRester = "Rester sur la page",
}: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      ouvert={blocage.state === "blocked"}
      titre={titre}
      description={description}
      libelleConfirmer={libelleQuitter}
      libelleAnnuler={libelleRester}
      onConfirmer={() => blocage.proceed?.()}
      onAnnuler={() => blocage.reset?.()}
    />
  )
}
