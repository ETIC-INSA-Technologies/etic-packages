import type { ComponentProps } from "react"
import { cn } from "cn"

export interface EmptyValueProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** Ce qu'entend un lecteur d'écran à la place du tiret : « non
   *  renseigné » par défaut. */
  libelle?: string
}

/**
 * Valeur absente dans une cellule, une ligne de détail ou un texte : le
 * tiret « — » des formateurs (`formaterDate(null)`…), en gris. Le tiret est
 * masqué aux lecteurs d'écran, qui entendent `libelle` à la place (un tiret
 * lu « tiret cadratin », ou rien, ne dit pas que la valeur manque).
 *
 * ```tsx
 * cell: ({ row }) => row.original.titre ?? <EmptyValue />
 * ```
 */
export function EmptyValue({
  libelle = "non renseigné",
  className,
  ...props
}: EmptyValueProps) {
  return (
    <span
      data-slot="empty-value"
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      <span aria-hidden="true">—</span>
      <span className="sr-only">{libelle}</span>
    </span>
  )
}
