import { useState, type ComponentProps, type ReactNode } from "react"
import { SearchXIcon } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type SheetTaille,
} from "@etic-ui/components/ui/sheet"
import { Skeleton } from "@etic-ui/components/ui/skeleton"
import { EmptyState } from "@etic-ui/components/etic/empty-state"

export interface DetailSheetIntrouvable {
  /** Titre du tiroir : « Document introuvable ». */
  titre: string
  /** Ce qui manque : « Ce document n'est pas dans la liste affichée ». */
  message: string
  /** Pourquoi, et comment le retrouver. */
  description?: ReactNode
}

export interface DetailSheetProps<T> {
  /**
   * L'élément affiché : `undefined` tant qu'il se charge, `null` s'il est
   * introuvable (le tiroir le dit, avec sa croix pour le fermer).
   */
  element: T | null | undefined
  ouvert: boolean
  onOuvertChange: (ouvert: boolean) => void
  /** Largeur au-delà de 640 px (voir `SheetContent`) ; `lg` par défaut.
   *  En dessous, le tiroir prend tout l'écran. */
  taille?: SheetTaille
  /** Ce que dit le tiroir d'un élément introuvable. */
  introuvable: DetailSheetIntrouvable
  initialFocus?: ComponentProps<typeof SheetContent>["initialFocus"]
  className?: string
  /** Le contenu pour l'élément : `SheetHeader`, `SheetBody`, `SheetFooter`. */
  children: (element: T) => ReactNode
}

/**
 * Tiroir de détail d'un élément de liste, à droite : l'élément (`children`,
 * appelé avec lui), ou, quand il manque, un chargement (`undefined`) ou
 * « introuvable » (`null`). Fermé, il garde ce qu'il affichait le temps de
 * son animation, au lieu de se vider en glissant. Compagnon de
 * `useDetailSheet`, qui le pilote par un identifiant (paramètre d'URL…).
 */
export function DetailSheet<T>({
  element,
  ouvert,
  onOuvertChange,
  taille = "lg",
  introuvable,
  initialFocus,
  className,
  children,
}: DetailSheetProps<T>) {
  const [affiche, setAffiche] = useState(element)
  if (ouvert && element !== affiche) setAffiche(element)
  const montre = ouvert ? element : affiche
  return (
    <Sheet open={ouvert} onOpenChange={onOuvertChange}>
      <SheetContent
        side="right"
        taille={taille}
        initialFocus={initialFocus}
        className={className}
      >
        {montre === undefined ? (
          <>
            <SheetHeader>
              <SheetTitle>Chargement…</SheetTitle>
            </SheetHeader>
            <div
              data-slot="detail-sheet-chargement"
              className="flex flex-col gap-3 px-4"
            >
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </>
        ) : montre === null ? (
          <>
            <SheetHeader>
              <SheetTitle>{introuvable.titre}</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <EmptyState
                icone={SearchXIcon}
                titre={introuvable.message}
                description={introuvable.description}
              />
            </div>
          </>
        ) : (
          children(montre)
        )}
      </SheetContent>
    </Sheet>
  )
}
