// Démonstrations des boutons : états, liens, bouton de copie dans un groupe.
import { useState, type ReactNode } from "react"
import { ArrowLeftIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react"

import {
  Button,
  ButtonLink,
  CopyButton,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  TooltipButton,
} from "@etic-ui/index"

/** Bouton en cours d'action deux secondes après un clic. */
function DemoEnCours() {
  const [enCours, setEnCours] = useState(false)
  const lancer = () => {
    setEnCours(true)
    setTimeout(() => setEnCours(false), 2000)
  }
  return (
    <>
      <Button
        enCours={enCours}
        libelleEnCours="Enregistrement…"
        onClick={lancer}
      >
        <SaveIcon data-icon="inline-start" />
        Enregistrer
      </Button>
      <TooltipButton
        variant="outline"
        size="icon"
        infobulle="Enregistrer"
        enCours={enCours}
        onClick={lancer}
      >
        <SaveIcon />
      </TooltipButton>
    </>
  )
}

export const BOUTONS: {
  id: string
  titre: string
  rendu: () => ReactNode
}[] = [
  {
    id: "boutons-etats",
    titre: "Button : états, ButtonLink",
    rendu: () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled>désactivé</Button>
          <Button disabled focusableWhenDisabled>
            aria-disabled
          </Button>
          <TooltipButton variant="outline" verrou="Droits insuffisants">
            Verrouillé
          </TooltipButton>
          <DemoEnCours />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            infobulle="Supprimer"
            destructif
          >
            <Trash2Icon />
          </TooltipButton>
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            infobulle="Retirer"
            destructif
          >
            <XIcon />
          </TooltipButton>
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            infobulle="Retirer"
            verrou="Indispensable à l'application"
            destructif
          >
            <XIcon />
          </TooltipButton>
        </div>
        <p className="text-sm">
          Trois erreurs bloquantes.{" "}
          <Button variant="link" size="inline">
            Voir le détail
          </Button>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="#boutons-etats" variant="outline">
            <ArrowLeftIcon data-icon="inline-start" />
            Retour
          </ButtonLink>
          <ButtonLink href="#boutons-etats" variant="link" size="inline">
            Voir la fiche
          </ButtonLink>
        </div>
        <div className="flex max-w-sm flex-col gap-2">
          <InputGroup>
            <InputGroupInput
              aria-label="Valeur à copier"
              className="font-mono"
              readOnly
              value="exemple-de-valeur-a-copier"
            />
            <InputGroupAddon align="inline-end">
              <CopyButton
                valeur="exemple-de-valeur-a-copier"
                libelle="Copier la valeur"
              />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    ),
  },
]
