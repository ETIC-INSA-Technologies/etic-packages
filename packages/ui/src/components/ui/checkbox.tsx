import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "cn"
import { CheckIcon, MinusIcon } from "lucide-react"

// Écart avec shadcn : la case s'estompe d'après son propre état
// (`data-disabled`, `aria-disabled`, `fieldset` désactivé) et non par
// `group-has-disabled/field`, qui estompait toutes les cases d'un champ dès
// qu'une seule y était figée (une `CheckboxList` dans un `FormField`). Les
// variantes `disabled:` de shadcn sont retirées : la racine est un `<span>`,
// qui n'est jamais `:disabled`. Dans un `<fieldset disabled>`, la case est
// réellement inactive (Base UI la coche par son entrée cachée, que le
// fieldset désactive : ni clic ni Espace n'y font rien) : elle en a l'air.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-(--control-border) transition-colors outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-(--control-border) after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 in-[fieldset:disabled]:cursor-not-allowed in-[fieldset:disabled]:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:data-indeterminate:bg-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon className="[[data-indeterminate]_&]:hidden" />
        <MinusIcon className="hidden [[data-indeterminate]_&]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
