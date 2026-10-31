import { useId, type ComponentProps, type ReactNode } from "react"
import { CheckboxGroup } from "@base-ui/react/checkbox-group"
import { cn } from "cn"

import { Checkbox } from "@etic-ui/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@etic-ui/components/ui/field"
import {
  attributsDuGroupe,
  useFormField,
} from "@etic-ui/components/etic/form-field-context"

export interface CheckboxListOption {
  /** Valeur portée par la sélection. */
  valeur: string
  libelle: ReactNode
  /** Précision sous le libellé (pourquoi la case est figée…), reliée à la
   *  case par `aria-describedby`. */
  description?: ReactNode
  /** Fige la case dans son état actuel. */
  disabled?: boolean
}

export interface CheckboxListProps extends Omit<
  ComponentProps<"div">,
  "children" | "defaultValue"
> {
  options: CheckboxListOption[]
  /** Valeurs cochées. */
  valeurs: string[]
  onValeursChange: (valeurs: string[]) => void
  /** Affiché à la place de la liste quand il n'y a rien à cocher. */
  vide?: ReactNode
  disabled?: boolean
  /** Au moins une case à cocher : le groupe se dit « obligatoire » (un
   *  groupe n'admet pas `aria-required`). Par défaut, celui du `FormField`.
   *  La vérification reste à l'application. */
  required?: boolean
}

/**
 * Choix de plusieurs valeurs parmi une liste : le groupe de cases de Base UI
 * (`CheckboxGroup`), chaque case en `Field` horizontal de shadcn, en grille.
 * Le titre du groupe vient de son contexte (`FormField`, `aria-label`…).
 */
export function CheckboxList({
  options,
  valeurs,
  onValeursChange,
  vide = "Aucun élément disponible.",
  disabled = false,
  required,
  className,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: CheckboxListProps) {
  const prefixe = useId()
  // Un `<label for>` ne nomme pas un groupe : il cite le libellé du champ.
  const { obligatoire, attributs } = attributsDuGroupe(
    useFormField(),
    {
      required,
      "aria-labelledby": ariaLabelledby,
      "aria-describedby": ariaDescribedby,
      "aria-invalid": ariaInvalid,
    },
    `${prefixe}-obligatoire`
  )
  if (options.length === 0)
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>{vide}</p>
    )

  return (
    <CheckboxGroup
      {...attributs}
      {...props}
      // `role="group"` n'admet pas aria-required (posé par FormField).
      aria-required={undefined}
      value={valeurs}
      onValueChange={(suivantes) => onValeursChange(suivantes)}
      disabled={disabled}
      data-slot="checkbox-group"
      className={cn("grid gap-3 sm:grid-cols-2", className)}
    >
      {obligatoire ? (
        <span id={`${prefixe}-obligatoire`} hidden>
          obligatoire
        </span>
      ) : null}
      {options.map((option, index) => {
        const id = `${prefixe}-${index}`
        const idDescription = `${id}-description`
        return (
          <Field
            key={option.valeur}
            orientation="horizontal"
            data-disabled={disabled || option.disabled || undefined}
          >
            <Checkbox
              id={id}
              value={option.valeur}
              disabled={option.disabled}
              aria-describedby={option.description ? idDescription : undefined}
            />
            <FieldContent>
              <FieldLabel htmlFor={id} className="font-normal">
                {option.libelle}
              </FieldLabel>
              {option.description ? (
                <FieldDescription id={idDescription}>
                  {option.description}
                </FieldDescription>
              ) : null}
            </FieldContent>
          </Field>
        )
      })}
    </CheckboxGroup>
  )
}
