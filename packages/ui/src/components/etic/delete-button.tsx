import type { ReactNode } from "react"
import { Trash2Icon } from "lucide-react"

import type { ActionDialogue } from "@etic-ui/components/etic/action"
import {
  ConfirmDialog,
  type ConfirmDialogSaisie,
  type DialogFinalFocus,
} from "@etic-ui/components/etic/confirm-dialog"
import {
  TooltipButton,
  type TooltipButtonProps,
} from "@etic-ui/components/etic/tooltip-button"

export interface DeleteButtonProps {
  /**
   * Ce qui est supprimé, avec son déterminant : « ce groupe ». Donne le nom
   * accessible et l'infobulle (« Supprimer ce groupe »), et le titre de la
   * confirmation par défaut.
   */
  libelle: string
  /**
   * La suppression, lancée après confirmation (voir `ConfirmDialog`) :
   * promesse attendue, erreur affichée dans le dialogue, `false` pour le
   * garder ouvert sans erreur (suppression en deux temps).
   */
  onSupprimer: ActionDialogue
  /** Ce que dit la confirmation. */
  confirmation: {
    /** « Supprimer {libelle} » par défaut. */
    titre?: string
    /** La phrase qui nomme ce qui sera détruit : « Le groupe Bureau et ses
     *  14 rattachements seront supprimés définitivement. » */
    description: ReactNode
    /** Sous la description : la liste des éléments touchés… */
    details?: ReactNode
    /** « Supprimer » par défaut. */
    libelleConfirmer?: string
    saisie?: ConfirmDialogSaisie
  }
  /** Suppression impossible : le bouton est désactivé et son infobulle dit
   *  pourquoi, au lieu de promettre une action qu'il refusera. */
  verrou?: string
  /**
   * Le mot « Supprimer » au lieu de la corbeille : pour un en-tête de page,
   * parmi d'autres boutons texte, où détruire toute la fiche mérite d'être
   * écrit en toutes lettres.
   */
  avecTexte?: boolean
  /**
   * Taille du bouton, celle de `Button` : `icon-sm` par défaut pour la
   * corbeille, `default` avec `avecTexte` (`lg` dans un en-tête de page,
   * qui l'agrandit seul). Corbeille dans un en-tête : `icon-lg`.
   */
  size?: TooltipButtonProps["size"]
  /** Ouverture de la confirmation suivie par l'application (le bouton reste
   *  son déclencheur) : pour oublier un état « en deux temps » à la
   *  fermeture, par exemple. */
  ouvert?: boolean
  onOuvertChange?: (ouvert: boolean) => void
  /**
   * Où mettre le focus quand la confirmation se ferme. Par défaut, le
   * bouton. Dans une ligne de `DataTable` qui disparaît avec la suppression,
   * le tableau rend lui-même le focus à la ligne voisine ; ailleurs (fiche
   * supprimée, tableau rendu à la main), à fournir : le titre de la liste…
   */
  finalFocus?: DialogFinalFocus
  className?: string
}

/**
 * Bouton de suppression : une corbeille discrète (rouge au survol seulement :
 * une colonne de corbeilles rouges ferait une colonne d'alarmes), qui ouvre
 * une confirmation nommant ce qui va être détruit.
 */
export function DeleteButton({
  libelle,
  onSupprimer,
  confirmation,
  verrou,
  avecTexte = false,
  size,
  ouvert,
  onOuvertChange,
  finalFocus,
  className,
}: DeleteButtonProps) {
  const nom = `Supprimer ${libelle}`
  const bouton = (
    <TooltipButton
      aria-label={nom}
      verrou={verrou}
      className={className}
      {...(avecTexte
        ? { variant: "destructive", size }
        : {
            variant: "ghost",
            size: size ?? "icon-sm",
            infobulle: nom,
            destructif: true,
          })}
    >
      {avecTexte ? (
        <>
          <Trash2Icon data-icon="inline-start" />
          Supprimer
        </>
      ) : (
        <Trash2Icon />
      )}
    </TooltipButton>
  )

  if (verrou) return bouton

  return (
    <ConfirmDialog
      titre={confirmation.titre ?? nom}
      description={confirmation.description}
      libelleConfirmer={confirmation.libelleConfirmer ?? "Supprimer"}
      saisie={confirmation.saisie}
      onConfirmer={onSupprimer}
      declencheur={bouton}
      ouvert={ouvert}
      onOuvertChange={onOuvertChange}
      finalFocus={finalFocus}
    >
      {confirmation.details}
    </ConfirmDialog>
  )
}
