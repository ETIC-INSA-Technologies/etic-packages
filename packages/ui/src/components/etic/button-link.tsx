import type { ComponentProps } from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { buttonVariants } from "@etic-ui/components/ui/button"
import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"

export interface ButtonLinkProps
  extends ComponentProps<"a">, VariantProps<typeof buttonVariants> {
  /**
   * Composant de lien de l'application (celui de son routeur, qui reçoit
   * `href`) ; par défaut, celui du `LienProvider`, sinon un `<a>`. `"a"`
   * force un rechargement complet.
   */
  lien?: LienComposant
}

/**
 * Lien à l'allure de bouton, annoncé comme un lien : il mène à une page
 * (« Retour », « Voir la fiche »), il ne lance pas d'action. Un `Button`
 * rendu en lien (`render={<a />}`) recevrait `role="button"` de Base UI et
 * serait annoncé comme un bouton.
 */
export function ButtonLink({
  lien,
  variant = "default",
  size = "default",
  className,
  ...props
}: ButtonLinkProps) {
  const Lien = useLien(lien)
  return (
    // Le composant vient des props ou du contexte : stable d'un rendu à
    // l'autre, il n'est pas créé pendant le rendu (faux positif de la règle).
    // eslint-disable-next-line react-hooks/static-components
    <Lien
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
