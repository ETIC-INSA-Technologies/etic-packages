import { useEffect, useRef, useState } from "react"
import { cn } from "cn"
import { CheckIcon, CopyIcon, XIcon } from "lucide-react"

import {
  TooltipButton,
  type TooltipButtonProps,
} from "@etic-ui/components/etic/tooltip-button"

/** Écrit dans le presse-papiers : l'API asynchrone si elle est là, sinon un
 *  champ caché et `execCommand` (contexte non sécurisé, vieux navigateur). */
async function copier(texte: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texte)
      return true
    } catch {
      // On tente l'ancienne méthode.
    }
  }
  const champ = document.createElement("textarea")
  try {
    champ.value = texte
    champ.setAttribute("readonly", "")
    champ.style.position = "fixed"
    champ.style.opacity = "0"
    document.body.appendChild(champ)
    champ.select()
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    // Retiré même si execCommand lève (absent ou refusé).
    champ.remove()
  }
}

export interface CopyButtonProps extends Omit<
  TooltipButtonProps,
  "value" | "onClick" | "children" | "infobulle"
> {
  /** Texte copié. */
  valeur: string
  /** Infobulle et nom accessible : ce qui est copié. « Copier » par défaut. */
  libelle?: string
  /** Après la copie, deux secondes. « Copié ! » par défaut. */
  libelleCopie?: string
  /** Quand le navigateur refuse la copie, quatre secondes. « Copie
   *  impossible : copiez le texte à la main » par défaut. */
  libelleEchec?: string
  /** Appelé après une copie réussie (un secret montré une seule fois…). */
  onCopie?: () => void
  /** Appelé quand la copie est refusée (permission, contexte non sûr). */
  onEchec?: () => void
}

/**
 * Bouton de copie : une icône seule, son libellé dans l'infobulle et le nom
 * accessible. Après la copie, une coche et « Copié ! » pendant deux
 * secondes ; si le navigateur la refuse, une croix et « Copie impossible ».
 * Les deux sont annoncés aux lecteurs d'écran. `verrou` comme pour
 * `TooltipButton`. Dans un `InputGroupAddon`, il passe à 24 px, sauf `size`
 * donnée.
 */
export function CopyButton({
  valeur,
  libelle = "Copier",
  libelleCopie = "Copié !",
  libelleEchec = "Copie impossible : copiez le texte à la main",
  onCopie,
  onEchec,
  variant = "outline",
  size: tailleDemandee,
  className,
  ...props
}: CopyButtonProps) {
  const [etat, setEtat] = useState<"copie" | "echec" | null>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(minuterie.current), [])

  const surClic = async () => {
    const reussi = await copier(valeur)
    setEtat(reussi ? "copie" : "echec")
    if (reussi) onCopie?.()
    else onEchec?.()
    clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => setEtat(null), reussi ? 2000 : 4000)
  }

  const annonce =
    etat === "copie" ? libelleCopie : etat === "echec" ? libelleEchec : ""
  return (
    <>
      <TooltipButton
        variant={variant}
        size={tailleDemandee ?? "icon-sm"}
        // Nom constant : le résultat est annoncé par la zone ci-dessous.
        aria-label={libelle}
        infobulle={annonce || libelle}
        data-copie={etat === "copie" || undefined}
        data-echec={etat === "echec" || undefined}
        className={cn(
          // Dans un groupe de saisie (`InputGroupAddon`), 24 px comme
          // l'`InputGroupButton` `icon-xs` de shadcn : à 28 px, le bouton
          // touchait presque la bordure du champ (1 px) et son anneau de
          // focus en sortait. Une taille donnée par l'application prime.
          // Écrites en entier : le bouton ignore où il est rendu (pas de
          // `render={<InputGroupButton />}` possible), et Tailwind ne voit
          // pas une classe préfixée au rendu (`inputGroupButtonVariants`).
          tailleDemandee === undefined &&
            "in-data-[slot=input-group-addon]:size-6 in-data-[slot=input-group-addon]:rounded-[calc(var(--radius)-3px)]",
          etat === "copie" && "text-success",
          etat === "echec" && "text-destructive",
          className
        )}
        onClick={surClic}
        {...props}
      >
        {etat === "copie" ? (
          <CheckIcon />
        ) : etat === "echec" ? (
          <XIcon />
        ) : (
          <CopyIcon />
        )}
      </TooltipButton>
      {/* Hors du bouton (ses enfants ne sont pas exposés) et montée en
          permanence : une zone insérée avec son texte n'est pas toujours lue. */}
      <span className="sr-only" role="status">
        {annonce}
      </span>
    </>
  )
}
