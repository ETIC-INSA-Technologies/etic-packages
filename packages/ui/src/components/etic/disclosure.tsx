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

/**
 * Déclencheur d'un `Collapsible`, précédé d'un chevron qui tourne d'un quart
 * de tour à l'ouverture, avec l'anneau de focus de la bibliothèque. Pour une
 * mise en page que `Disclosure` ne couvre pas (déclencheur et panneau
 * séparés) ; sinon, `Disclosure`.
 */
export function DisclosureTrigger({
  variante = "lien",
  taille,
  className,
  children,
  ...props
}: DisclosureTriggerProps) {
  if (variante === "carte") {
    return (
      <CollapsibleTrigger
        data-variante="carte"
        className={cn(
          "group/disclosure flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      >
        <ChevronRightIcon aria-hidden className={CHEVRON} />
        {children}
      </CollapsibleTrigger>
    )
  }
  const lien = variante === "lien"
  return (
    <CollapsibleTrigger
      data-variante={variante}
      render={
        <Button
          variant={lien ? "link" : "ghost"}
          size={taille ?? (lien ? "default" : "sm")}
        />
      }
      className={cn(
        "group/disclosure",
        // 24 px de haut au moins : cible tactile (WCAG 2.5.8).
        lien ? "h-auto min-h-6 px-0" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronRightIcon
        aria-hidden
        data-icon={lien ? undefined : "inline-start"}
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
      onOpenChange={
        onOuvertChange ? (suivant) => onOuvertChange(suivant) : undefined
      }
      className={cn(carte && "rounded-lg border", className)}
      {...props}
    >
      <DisclosureTrigger variante={variante} taille={taille}>
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
