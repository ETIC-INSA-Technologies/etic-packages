import {
  isValidElement,
  useId,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "cn"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@etic-ui/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  attributsDuGroupe,
  useFormField,
} from "@etic-ui/components/etic/form-field-context"
import { TONS, type StatusTon } from "@etic-ui/lib/ton"

export interface SegmentedControlOption<T extends string> {
  valeur: T
  libelle: ReactNode
  /** Infobulle ; nom accessible du segment quand son libellé est une icône
   *  seule (élément sans texte, `<BanIcon />`). */
  infobulle?: string
  /** Couleur du segment choisi (fond, texte et liseré), par exemple celle de
   *  l'état que produit le choix ; « neutral » (par défaut) : le fond gris
   *  du ToggleGroup. */
  ton?: StatusTon
  /** Classes du segment. */
  className?: string
}

export interface SegmentedControlProps<T extends string> extends Omit<
  ComponentProps<typeof ToggleGroup>,
  "value" | "defaultValue" | "onValueChange" | "multiple" | "children"
> {
  /** Segment choisi ; `null` : aucun encore. */
  valeur: T | null
  onValeurChange: (valeur: T) => void
  options: SegmentedControlOption<T>[]
  /** Un segment doit être choisi : le groupe se dit « obligatoire » (un
   *  groupe n'admet pas `aria-required`). Par défaut, celui du `FormField`. */
  required?: boolean
  /** Ignoré : `role="group"` ne l'admet pas (voir `required`). */
  "aria-required"?: boolean | "true" | "false"
}

/** Un libellé sans texte, comme `<BanIcon />` : l'infobulle le nomme. */
const iconeSeule = (libelle: ReactNode) =>
  isValidElement<{ children?: ReactNode }>(libelle) &&
  libelle.props.children == null

/**
 * Choix exclusif entre deux à cinq options, lisible d'un coup d'œil (dans une
 * ligne de tableau…) : le ToggleGroup de shadcn en boutons joints, à valeur
 * unique. Un segment choisi ne se désélectionne pas en le recliquant.
 */
export function SegmentedControl<T extends string>({
  valeur,
  onValeurChange,
  options,
  required,
  variant = "outline",
  spacing = 0,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: SegmentedControlProps<T>) {
  const idMention = useId()
  // Dans un FormField : un `<label for>` ne nomme pas un groupe, il cite le
  // libellé.
  const { obligatoire, attributs } = attributsDuGroupe(
    useFormField(),
    {
      required,
      "aria-labelledby": ariaLabelledby,
      "aria-describedby": ariaDescribedby,
      "aria-invalid": ariaInvalid,
    },
    idMention
  )
  return (
    <ToggleGroup
      {...attributs}
      variant={variant}
      spacing={spacing}
      {...props}
      // `role="group"` n'admet pas aria-required (posé par FormField).
      aria-required={undefined}
      value={valeur === null ? [] : [valeur]}
      onValueChange={(suivante) => {
        // Le ToggleGroup rend [] quand on reclique le segment choisi.
        const choisie = suivante.find((v) => v !== valeur)
        if (choisie !== undefined) onValeurChange(choisie as T)
      }}
    >
      {obligatoire ? (
        <span id={idMention} hidden>
          obligatoire
        </span>
      ) : null}
      {options.map((option) => {
        const segment = (
          <ToggleGroupItem
            key={option.valeur}
            value={option.valeur}
            // Le fond bg-muted du ToggleGroup se distingue mal du blanc : le
            // segment choisi prend aussi un liseré intérieur (≥ 3:1).
            className={cn(
              "aria-pressed:text-foreground aria-pressed:inset-ring aria-pressed:inset-ring-foreground/50",
              // Avec un ton, sa couleur : le liseré garde ≥ 3:1 sur le fond.
              TONS[option.ton ?? "neutral"].segmentChoisi,
              option.className
            )}
            // Le nom accessible contient le libellé visible : l'infobulle ne
            // nomme qu'une icône seule.
            aria-label={
              iconeSeule(option.libelle) ? option.infobulle : undefined
            }
          >
            {option.libelle}
          </ToggleGroupItem>
        )
        return option.infobulle ? (
          <Tooltip key={option.valeur}>
            <TooltipTrigger render={segment} />
            <TooltipContent>{option.infobulle}</TooltipContent>
          </Tooltip>
        ) : (
          segment
        )
      })}
    </ToggleGroup>
  )
}
