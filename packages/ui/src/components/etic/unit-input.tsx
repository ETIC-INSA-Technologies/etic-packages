import type { ComponentProps, ReactNode } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@etic-ui/components/ui/input-group"
import { NO_AUTOFILL } from "@etic-ui/lib/autofill"

export interface UnitInputProps extends ComponentProps<"input"> {
  /** L'unité, à droite de la saisie : « % », « € », « Mo », « jours »… */
  unite: ReactNode
}

/**
 * Champ chiffré suivi de son unité : un `InputGroup` dont le suffixe dit ce
 * qu'on saisit. Comme les autres composites, `className` va à l'enveloppe
 * (sa largeur : `max-w-32`…) et tous les autres attributs au champ de
 * saisie, qui reçoit aussi ceux d'un `FormField` (`id`, `aria-*`,
 * `required`).
 *
 * Par défaut, saisie décimale au clavier mobile (`inputMode="decimal"`),
 * chiffres à chasse fixe et `NO_AUTOFILL` (un nombre n'est jamais un
 * identifiant) ; chaque attribut passé l'emporte. Un champ texte relu par
 * `lireNombre` admet la virgule, ce que `type="number"` refuse selon le
 * navigateur.
 *
 * ```tsx
 * <FormField libelle="Acompte">
 *   <UnitInput unite="%" className="max-w-32" value={saisie} onChange={…} />
 * </FormField>
 * ```
 */
export function UnitInput({
  unite,
  className,
  inputMode = "decimal",
  ...props
}: UnitInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroupInput
        {...NO_AUTOFILL}
        inputMode={inputMode}
        className="tabular-nums"
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unite}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
