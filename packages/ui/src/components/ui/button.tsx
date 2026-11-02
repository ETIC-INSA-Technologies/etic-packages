import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { SpinnerDecoratif } from "@etic-ui/components/ui/spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:not-aria-disabled:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 aria-disabled:not-data-en-cours:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-en-cours:cursor-progress dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary-text underline-offset-4 hover:underline",
      },
      // Ajout ETIC : `default` et `icon` lisent leur hauteur dans
      // --bouton-hauteur et --bouton-icone (32 px sans elles, comme h-8 et
      // size-8 de shadcn). Les actions d'un en-tête de page les posent à
      // 36 px : la variable s'hérite dans la zone, pas dans un portail, et
      // une hauteur donnée par `className` l'emporte (tailwind-merge).
      size: {
        default:
          "h-[var(--bouton-hauteur,2rem)] gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-[var(--bouton-icone,2rem)]",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        // Ajout ETIC : lien dans une phrase ou une cellule (avec
        // `variant="link"`), sans hauteur ni marge de bouton ; `min-h-6`
        // garde une cible tactile de 24 px (WCAG 2.5.8).
        inline: "h-auto min-h-6 gap-1 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * Action en cours (ajout ETIC) : roue muette à la place des icônes,
     * `aria-busy`, clics ignorés. Le bouton reste focalisable
     * (`focusableWhenDisabled`) : désactivé nativement, il rendrait le focus
     * à la page.
     */
    enCours?: boolean
    /** Libellé pendant l'action (« Suppression… ») ; sans lui, le contenu
     *  reste. */
    libelleEnCours?: React.ReactNode
  }

/** Contenu d'un bouton en cours : ses icônes retirées (la roue prend leur
 *  place, et les marges `has-data-[icon=…]` suivent), tout son contenu
 *  pour un bouton à icône seule. */
function sansIcones(children: React.ReactNode, iconeSeule: boolean) {
  if (iconeSeule) return null
  return React.Children.toArray(children).filter(
    (enfant) =>
      !(
        React.isValidElement<{ "data-icon"?: unknown }>(enfant) &&
        enfant.props["data-icon"] !== undefined
      )
  )
}

/** Variante de survol (`hover:`, `dark:hover:`…) d'une classe. */
const SURVOL = /(^|:)hover:/

function Button({
  className,
  variant = "default",
  size = "default",
  enCours = false,
  libelleEnCours,
  disabled,
  focusableWhenDisabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  // Sans contenu donné, rien n'est passé : les enfants d'un élément `render`
  // restent. En cours, la roue remplace l'icône de tête (ou l'icône seule) ;
  // un bouton à texte sans icône s'élargit de la roue, comme le libellé
  // d'attente le change déjà, plutôt que de cacher son texte.
  const contenu = enCours ? (
    <>
      <SpinnerDecoratif data-icon="inline-start" />
      {libelleEnCours ?? sansIcones(children, String(size).startsWith("icon"))}
    </>
  ) : (
    children
  )
  return (
    <ButtonPrimitive
      data-slot="button"
      // En cours : curseur d'attente et pas de survol (le clic est ignoré).
      className={
        enCours
          ? classes
              .split(" ")
              .filter((classe) => !SURVOL.test(classe))
              .join(" ")
          : classes
      }
      data-en-cours={enCours || undefined}
      disabled={disabled || enCours}
      focusableWhenDisabled={focusableWhenDisabled || enCours}
      aria-busy={enCours || undefined}
      {...props}
      {...(contenu === undefined ? {} : { children: contenu })}
    />
  )
}

export { Button, buttonVariants }
