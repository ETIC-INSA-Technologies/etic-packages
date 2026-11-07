import type { ComponentProps, ReactNode } from "react"
import type { VariantProps } from "class-variance-authority"
import { ExternalLinkIcon, type LucideIcon } from "lucide-react"

import { buttonVariants } from "@etic-ui/components/ui/button"
import { DropdownMenuItem } from "@etic-ui/components/ui/dropdown-menu"
import { ButtonLink } from "@etic-ui/components/etic/button-link"

/** Ce que porte tout lien sortant : `target` ne va jamais sans
 *  `rel="noopener noreferrer"`, qui retire à la page ouverte toute référence
 *  à celle-ci. */
export const NOUVEL_ONGLET = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const

/** La flèche sortante, et ce qu'elle dit aux lecteurs d'écran. */
export function MarqueExterne({ className }: { className?: string }) {
  return (
    <>
      <ExternalLinkIcon
        data-icon="inline-end"
        className={className}
        aria-hidden="true"
      />
      <span className="sr-only"> (nouvel onglet)</span>
    </>
  )
}

export interface ExternalLinkProps
  extends
    Omit<ComponentProps<"a">, "href" | "target" | "rel">,
    Pick<VariantProps<typeof buttonVariants>, "size"> {
  /** Adresse de la page ; absente, le lien n'en a pas (texte inerte). */
  href: string | null | undefined
  /** `link` (dans le texte, par défaut), ou un bouton `outline`, `ghost`,
   *  `secondary`, `default`. */
  variant?: "link" | "outline" | "ghost" | "secondary" | "default"
  children: ReactNode
}

/**
 * Lien vers une page hébergée ailleurs (document partagé, outil externe) :
 * il s'ouvre dans un autre onglet, et le dit (flèche sortante, « nouvel
 * onglet » pour les lecteurs d'écran). Dans le texte par défaut (taille
 * `inline`) ; à l'allure d'un bouton avec `variant`.
 */
export function ExternalLink({
  href,
  variant = "link",
  size,
  children,
  ...props
}: ExternalLinkProps) {
  return (
    <ButtonLink
      lien="a"
      variant={variant}
      size={size ?? (variant === "link" ? "inline" : "default")}
      href={href ?? undefined}
      {...props}
      {...NOUVEL_ONGLET}
    >
      {children}
      <MarqueExterne />
    </ButtonLink>
  )
}

export interface DropdownMenuExternalLinkProps extends Omit<
  ComponentProps<typeof DropdownMenuItem>,
  "render" | "children"
> {
  href: string
  /** Icône lucide devant le libellé. */
  icone?: LucideIcon
  children: ReactNode
}

/** Entrée d'un menu (« … », « Plus d'actions ») qui ouvre une page ailleurs,
 *  dans un nouvel onglet, flèche sortante à droite. */
export function DropdownMenuExternalLink({
  href,
  icone: Icone,
  children,
  ...props
}: DropdownMenuExternalLinkProps) {
  return (
    <DropdownMenuItem render={<a href={href} {...NOUVEL_ONGLET} />} {...props}>
      {Icone ? <Icone /> : null}
      {children}
      <MarqueExterne className="ml-auto" />
    </DropdownMenuItem>
  )
}
