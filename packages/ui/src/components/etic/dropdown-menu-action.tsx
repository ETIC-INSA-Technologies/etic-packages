import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import { DropdownMenuItem } from "@etic-ui/components/ui/dropdown-menu"

export interface DropdownMenuActionProps extends Omit<
  ComponentProps<typeof DropdownMenuItem>,
  "children" | "variant"
> {
  libelle: ReactNode
  /** Appelé au choix de l'entrée (clic, Entrée). `onClick` convient aussi. */
  onChoisir?: () => void
  /** Icône lucide (le composant : `icone={ArchiveIcon}`), devant le libellé. */
  icone?: LucideIcon
  /** En rouge. */
  destructif?: boolean
  /**
   * Action impossible, et pourquoi : l'entrée est grisée, ne fait rien, et
   * cette raison s'affiche sous son libellé, lisible (une entrée désactivée
   * ne reçoit ni survol ni infobulle). Comme `verrou` de `TooltipButton`.
   */
  verrou?: ReactNode
  /** Ligne d'aide discrète sous le libellé d'une entrée active (ce que fait
   *  l'action). Un `verrou` la remplace. */
  description?: ReactNode
}

/**
 * Entrée d'un menu d'actions (`DataTableRowActions`, « … » de
 * `DataTableBulkActions`, tout `DropdownMenuContent`) : libellé, icône,
 * variante destructive, et `verrou` pour une action visible mais
 * impossible, sa raison sous le libellé. C'est l'entrée de « Plus
 * d'actions » de `DetailHeader`. Un lien passe par `render`, comme pour
 * `DropdownMenuItem`.
 */
export function DropdownMenuAction({
  libelle,
  onChoisir,
  onClick,
  icone: Icone,
  destructif = false,
  verrou,
  description,
  disabled,
  className,
  ...props
}: DropdownMenuActionProps) {
  const verrouille = verrou !== undefined && verrou !== null && verrou !== false
  const sousTitre = verrouille ? verrou : description
  return (
    <DropdownMenuItem
      variant={destructif ? "destructive" : "default"}
      disabled={verrouille || disabled}
      onClick={(evenement) => {
        onClick?.(evenement)
        onChoisir?.()
      }}
      // La raison doit rester lisible (4,5:1) : seuls l'icône et le libellé
      // sont estompés, pas toute l'entrée.
      className={cn(verrouille && "data-disabled:opacity-100", className)}
      {...props}
    >
      {Icone ? (
        <Icone className={verrouille ? "opacity-50" : undefined} />
      ) : null}
      {sousTitre !== undefined && sousTitre !== null && sousTitre !== false ? (
        <span className="flex min-w-0 flex-col">
          <span className={verrouille ? "opacity-50" : undefined}>
            {libelle}
          </span>
          <span
            data-slot={
              verrouille
                ? "dropdown-menu-action-verrou"
                : "dropdown-menu-action-description"
            }
            className="text-xs text-muted-foreground"
          >
            {sousTitre}
          </span>
        </span>
      ) : (
        libelle
      )}
    </DropdownMenuItem>
  )
}
