import { cn } from "cn"
import { CheckIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"

export interface SaveBarProps {
  /** Enregistrement en cours : « Enregistrer » devient « Enregistrement… »,
   *  occupé (`aria-busy`), ignore les clics, mais garde le focus ;
   *  « Annuler » attend la fin. */
  enCours?: boolean
  /** Rien à enregistrer, ou une saisie à corriger d'abord. */
  desactive?: boolean
  /** Affiche « Enregistré » : la dernière mutation a réussi
   *  (`mutation.isSuccess`). `modifie` l'emporte. */
  enregistre?: boolean
  /** Des modifications attendent : le statut dit « Modifications non
   *  enregistrées », la raison pour laquelle « Enregistrer » est actif,
   *  même après un enregistrement réussi. */
  modifie?: boolean
  /** Barre collée en bas d'un formulaire plus haut que l'écran, opaque,
   *  boutons à droite. Lui passer aussi `modifie`, pour qu'elle ne flotte
   *  pas sur le contenu sans dire pourquoi. */
  collante?: boolean
  /** Sans gestionnaire, « Enregistrer » soumet le formulaire qui l'entoure. */
  onEnregistrer?: () => void
  /** Revenir à ce qui est enregistré : affiche « Annuler ». À ne passer que
   *  s'il y a des modifications (`onAnnuler={modifie ? annuler : undefined}`). */
  onAnnuler?: () => void
  className?: string
}

/**
 * Pied d'un formulaire de page (profil, paramètres) : « Enregistrer »,
 * « Annuler » au besoin, et le statut, annoncé (« Enregistré »,
 * « Modifications non enregistrées »).
 */
export function SaveBar({
  enCours = false,
  desactive = false,
  enregistre = false,
  modifie = false,
  collante = false,
  onEnregistrer,
  onAnnuler,
  className,
}: SaveBarProps) {
  const enregistrer = (
    <Button
      type={onEnregistrer ? "button" : "submit"}
      onClick={onEnregistrer}
      enCours={enCours}
      libelleEnCours="Enregistrement…"
      // Désactivé mais focalisable : le bouton qu'on vient d'activer ne
      // rend pas le focus à <body> quand l'enregistrement finit et qu'il ne
      // reste rien à enregistrer.
      disabled={desactive}
      focusableWhenDisabled
    >
      Enregistrer
    </Button>
  )
  const annuler = onAnnuler ? (
    <Button
      variant="outline"
      onClick={onAnnuler}
      disabled={enCours}
      focusableWhenDisabled
    >
      Annuler
    </Button>
  ) : null
  // Toujours présent : une zone `status` ajoutée en même temps que son texte
  // n'est pas annoncée.
  const statut = (
    <p role="status" className="text-sm text-muted-foreground">
      {/* Une modification faite après l'enregistrement l'emporte :
          « Enregistré » ne vaut que pour ce qui est à l'écran. */}
      {modifie ? (
        "Modifications non enregistrées"
      ) : enregistre ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-success">
          <CheckIcon className="size-4" aria-hidden />
          Enregistré
        </span>
      ) : null}
    </p>
  )

  return (
    <div
      data-slot="save-bar"
      data-collante={collante || undefined}
      className={cn(
        "flex flex-wrap items-center gap-3",
        // Toujours opaque : même sans modification, la barre passe sur le
        // contenu au défilement.
        collante &&
          "sticky bottom-4 z-10 justify-end rounded-xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur",
        className
      )}
    >
      {/* Ordre du DOM = ordre visuel : boutons d'abord, ou à droite quand
          la barre est collante. */}
      {collante ? statut : enregistrer}
      {annuler}
      {collante ? enregistrer : statut}
    </div>
  )
}
