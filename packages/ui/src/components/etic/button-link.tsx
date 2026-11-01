import type { ComponentProps } from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "cn"

import type { AppShellLienComposant } from "@etic-ui/components/etic/app-shell"
import { buttonVariants } from "@etic-ui/components/ui/button"

export interface ButtonLinkProps
  extends ComponentProps<"a">, VariantProps<typeof buttonVariants> {
  /**
   * Composant de lien de l'application (celui de son routeur, qui reçoit
   * `href`), comme pour `AppShell` et `DetailHeader` ; `<a>` par défaut.
   */
  lien?: AppShellLienComposant
}

/**
 * Lien à l'allure de bouton, annoncé comme un lien : il mène à une page
 * (« Retour », « Voir la fiche »), il ne lance pas d'action. Un `Button`
 * rendu en lien (`render={<a />}`) recevrait `role="button"` de Base UI et
 * serait annoncé comme un bouton.
 */
export function ButtonLink({
  lien: Lien = "a",
  variant = "default",
  size = "default",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Lien
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
