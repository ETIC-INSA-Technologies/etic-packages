import { useEffect, useEffectEvent, useId } from "react"
import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@etic-ui/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@etic-ui/components/ui/select"

/** Fenêtre de pages : la première, la dernière, la courante et ses voisines,
 *  « … » pour les pages sautées. Page 6 sur 20 : 1 … 5 6 7 … 20. */
function fenetre(courante: number, nombre: number): (number | "…")[] {
  const pages = [...new Set([1, nombre, courante, courante - 1, courante + 1])]
    .filter((p) => p >= 1 && p <= nombre)
    .sort((a, b) => a - b)
  const sortie: (number | "…")[] = []
  let precedente = 0
  for (const page of pages) {
    if (page - precedente > 1) sortie.push("…")
    sortie.push(page)
    precedente = page
  }
  return sortie
}

export interface DataTablePaginationProps {
  /** Nombre total d'éléments, toutes pages comprises. */
  total: number
  /** Rang (à partir de 0) du premier élément de la page. */
  decalage: number
  /** Nombre d'éléments par page. */
  limite: number
  onDecalageChange: (decalage: number) => void
  /** Sans lui, pas de choix du nombre par page. Changer de taille ramène à
   *  la première page (`onDecalageChange(0)`). */
  onLimiteChange?: (limite: number) => void
  /** Nombres d'éléments par page proposés. 10, 25, 50 et 100 par défaut. */
  limites?: readonly number[]
  className?: string
}

/**
 * Pagination par décalage (offset/limit, total connu) sur la Pagination de
 * shadcn : précédente, fenêtre de pages, suivante, et le nombre de lignes par
 * page (Select). Rien ne s'affiche quand tout tient sur une page de la plus
 * petite taille.
 */
export function DataTablePagination({
  total,
  decalage,
  limite,
  onDecalageChange,
  onLimiteChange,
  limites = [10, 25, 50, 100],
  className,
}: DataTablePaginationProps) {
  const idTaille = useId()
  const nombrePages = Math.max(1, Math.ceil(total / limite))
  const page = Math.min(Math.floor(decalage / limite) + 1, nombrePages)
  const tailles = [...new Set([...limites, limite])].sort((a, b) => a - b)
  const choixTaille = onLimiteChange !== undefined && total > tailles[0]

  // Décalage au-delà de la fin (dernière ligne de la dernière page
  // supprimée) : on ramène l'application sur la dernière page, sans quoi
  // elle afficherait une page vide sous un numéro de page surligné. Pas
  // tant que `total` vaut 0 : c'est souvent un total pas encore connu
  // (requête de la page suivante en cours, décalage lu dans l'URL), et le
  // ramener renverrait à la première page.
  const decalageMax = (nombrePages - 1) * limite
  const ramener = useEffectEvent(() => onDecalageChange(decalageMax))
  useEffect(() => {
    if (total > 0 && decalage >= total) ramener()
  }, [decalage, total])

  if (nombrePages <= 1 && !choixTaille) return null

  const allerA = (cible: number) =>
    onDecalageChange((Math.min(Math.max(1, cible), nombrePages) - 1) * limite)

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2",
        className
      )}
    >
      {choixTaille ? (
        <div className="flex items-center gap-2">
          <span id={idTaille} className="text-sm font-medium">
            Lignes par page
          </span>
          <Select
            value={String(limite)}
            onValueChange={(valeur) => {
              if (valeur === null) return
              onLimiteChange(Number(valeur))
              onDecalageChange(0)
            }}
          >
            <SelectTrigger className="w-[4.5rem]" aria-labelledby={idTaille}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" alignItemWithTrigger={false}>
              {tailles.map((taille) => (
                <SelectItem key={taille} value={String(taille)}>
                  {taille}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {nombrePages > 1 ? (
        <Pagination className="mx-0 ml-auto w-auto">
          <PaginationContent>
            <PaginationItem>
              {/* Focalisable désactivé : arrivé en bout de liste au clavier,
                  le focus reste sur le bouton au lieu de partir sur <body>. */}
              <Button
                variant="ghost"
                className="pl-1.5!"
                aria-label="Page précédente"
                disabled={page === 1}
                focusableWhenDisabled
                onClick={() => allerA(page - 1)}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:block">Précédente</span>
              </Button>
            </PaginationItem>
            {fenetre(page, nombrePages).map((p, i) => (
              <PaginationItem key={p === "…" ? `…${i}` : p}>
                {p === "…" ? (
                  <PaginationEllipsis />
                ) : (
                  <Button
                    variant={p === page ? "outline" : "ghost"}
                    size="icon"
                    aria-current={p === page ? "page" : undefined}
                    aria-label={`Page ${p}`}
                    onClick={() => allerA(p)}
                  >
                    {p}
                  </Button>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <Button
                variant="ghost"
                className="pr-1.5!"
                aria-label="Page suivante"
                disabled={page === nombrePages}
                focusableWhenDisabled
                onClick={() => allerA(page + 1)}
              >
                <span className="hidden sm:block">Suivante</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
          {/* Le focus reste sur la pagination, sous le tableau : la page
              atteinte est annoncée. */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {`Page ${page} sur ${nombrePages}`}
          </p>
        </Pagination>
      ) : null}
    </div>
  )
}
