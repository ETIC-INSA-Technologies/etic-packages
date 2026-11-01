import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"
import { ChevronRightIcon } from "lucide-react"

import { Badge } from "@etic-ui/components/ui/badge"
import { Button } from "@etic-ui/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@etic-ui/components/ui/collapsible"

/**
 * Allure du déclencheur d'un repli :
 * - `lien` : lien en ligne, sans marge (« Plus de champs », « Détails ») ;
 * - `discret` : bouton fantôme petit et estompé (historique, détails d'une
 *   section) ;
 * - `carte` : en-tête pleine largeur d'un bloc encadré (groupe d'un
 *   récapitulatif).
 */
export type DisclosureVariante = "lien" | "discret" | "carte"

/** Taille du bouton des variantes `lien` et `discret`. */
export type DisclosureTaille = "xs" | "sm" | "default"

export interface DisclosureTriggerProps extends ComponentProps<
  typeof CollapsibleTrigger
> {
  /** `lien` par défaut. */
  variante?: DisclosureVariante
  /** `default` pour `lien`, `sm` pour `discret` ; sans effet sur `carte`. */
  taille?: DisclosureTaille
}

const CHEVRON =
  "transition-transform motion-reduce:transition-none group-data-panel-open/disclosure:rotate-90"

/** Le `Button` de chaque variante, et ce qui le distingue. */
const VARIANTES: Record<
  DisclosureVariante,
  {
    variant: "link" | "ghost"
    taille: DisclosureTaille
    classes: string
    /** Retrait réduit du côté du chevron (`data-icon` de `Button`). */
    iconeEnTete: boolean
  }
> = {
  // 24 px de haut au moins : cible tactile (WCAG 2.5.8).
  lien: {
    variant: "link",
    taille: "default",
    classes: "h-auto min-h-6 px-0",
    iconeEnTete: false,
  },
  discret: {
    variant: "ghost",
    taille: "sm",
    classes: "text-muted-foreground",
    iconeEnTete: true,
  },
  carte: {
    variant: "ghost",
    taille: "default",
    classes:
      "h-auto w-full justify-start rounded-lg px-3 py-2 text-left whitespace-normal",
    iconeEnTete: false,
  },
}

/**
 * Déclencheur d'un `Collapsible`, sur `Button`, précédé d'un chevron qui
 * tourne d'un quart de tour à l'ouverture. Pour une mise en page que
 * `Disclosure` ne couvre pas (déclencheur et panneau séparés) ; sinon,
 * `Disclosure`.
 */
export function DisclosureTrigger({
  variante = "lien",
  taille,
  className,
  children,
  ...props
}: DisclosureTriggerProps) {
  const style = VARIANTES[variante]
  return (
    <CollapsibleTrigger
      data-variante={variante}
      render={
        <Button
          variant={style.variant}
          size={variante === "carte" ? style.taille : (taille ?? style.taille)}
        />
      }
      className={cn("group/disclosure", style.classes, className)}
      {...props}
    >
      <ChevronRightIcon
        aria-hidden
        data-icon={style.iconeEnTete ? "inline-start" : undefined}
        className={CHEVRON}
      />
      {children}
    </CollapsibleTrigger>
  )
}

export interface DisclosureProps extends Omit<
  ComponentProps<typeof Collapsible>,
  "children" | "open" | "defaultOpen" | "onOpenChange" | "title"
> {
  /** Libellé du déclencheur. */
  titre: ReactNode
  /** Nombre d'éléments repliés, en pastille après le titre. */
  compteur?: ReactNode
  /** `lien` par défaut. */
  variante?: DisclosureVariante
  taille?: DisclosureTaille
  /** Ouvert au premier rendu (non contrôlé). */
  defautOuvert?: boolean
  /** Ouvert ou fermé (contrôlé, avec `onOuvertChange`). */
  ouvert?: boolean
  onOuvertChange?: (ouvert: boolean) => void
  /** Classes du déclencheur (alignement sur le texte voisin : `-ml-2`…). */
  classNameDeclencheur?: string
  /** Classes du panneau (espacement, retrait…). */
  classNameContenu?: string
  /** Contenu replié : il n'est monté qu'à l'ouverture. */
  children: ReactNode
}

/**
 * Section repliable : un déclencheur à chevron (`DisclosureTrigger`) et son
 * panneau, fermé par défaut. Le contenu n'existe qu'à l'ouverture.
 */
export function Disclosure({
  titre,
  compteur,
  variante = "lien",
  taille,
  defautOuvert,
  ouvert,
  onOuvertChange,
  classNameDeclencheur,
  classNameContenu,
  className,
  children,
  ...props
}: DisclosureProps) {
  const carte = variante === "carte"
  return (
    <Collapsible
      data-slot="disclosure"
      defaultOpen={defautOuvert}
      open={ouvert}
      onOpenChange={onOuvertChange}
      className={cn(carte && "rounded-lg border", className)}
      {...props}
    >
      <DisclosureTrigger
        variante={variante}
        taille={taille}
        className={classNameDeclencheur}
      >
        {titre}
        {compteur !== undefined && compteur !== null ? (
          <>
            {/* Espace du nom accessible (« Ignorés 12 », pas « Ignorés12 ») ;
                sans effet visuel dans la boîte flexible. */}{" "}
            <Badge variant="secondary">{compteur}</Badge>
          </>
        ) : null}
      </DisclosureTrigger>
      <CollapsibleContent
        className={cn(
          "flex flex-col",
          carte ? "gap-2 border-t px-3 py-2" : "gap-3 pt-2",
          classNameContenu
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
