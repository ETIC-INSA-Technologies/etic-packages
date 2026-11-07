import type { ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@etic-ui/components/ui/select"
import { FormField } from "@etic-ui/components/etic/form-field"

export interface SelectFieldOption<V extends string = string> {
  valeur: V
  libelle: string
  /** Option visible mais impossible à choisir. */
  desactive?: boolean
  /** Ligne d'aide sous le libellé de l'option. */
  description?: ReactNode
}

export interface SelectFieldProps<V extends string = string> {
  libelle: ReactNode
  /** Option choisie ; `null` : rien n'est choisi, `placeholder` s'affiche. */
  valeur: V | null
  options: readonly SelectFieldOption<V>[]
  onValeurChange: (valeur: V) => void
  /** Texte du champ vide. « Choisir… » par défaut. */
  placeholder?: string
  description?: ReactNode
  /** Message d'erreur, ou plusieurs (un par ligne). */
  erreur?: ReactNode | string[]
  obligatoire?: boolean
  desactive?: boolean
  /** Nom du champ dans le formulaire (entrée cachée qui porte la valeur). */
  name?: string
  /** Affiché à la place des options quand il n'y en a aucune. */
  vide?: ReactNode
  /** Bouton à droite du contrôle (`action` de `FormField`). */
  action?: ReactNode
  /** Classes du champ (sa largeur). */
  className?: string
}

/**
 * Liste de choix d'un formulaire : le `Select` dans son `FormField`
 * (libellé, aide, erreur, obligatoire). Rien de choisi, le `placeholder`
 * s'affiche : aucune option « Choisir… » ne le remplace, qui serait
 * sélectionnable et cochée ; un choix est toujours une valeur.
 */
export function SelectField<V extends string>({
  libelle,
  valeur,
  options,
  onValeurChange,
  placeholder = "Choisir…",
  description,
  erreur,
  obligatoire,
  desactive,
  name,
  vide,
  action,
  className,
}: SelectFieldProps<V>) {
  return (
    <Select
      items={options.map((option) => ({
        value: option.valeur,
        label: option.libelle,
      }))}
      value={valeur}
      disabled={desactive}
      required={obligatoire}
      name={name}
      // Le type admet `null` (rien de choisi), mais aucune option ne le
      // porte : un choix de la personne est toujours une valeur.
      onValueChange={(choisie) => {
        if (choisie !== null) onValeurChange(choisie)
      }}
    >
      <FormField
        libelle={libelle}
        description={description}
        erreur={erreur ?? undefined}
        obligatoire={obligatoire}
        action={action}
        className={className}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormField>
      <SelectContent vide={vide}>
        {options.map((option) => (
          <SelectItem
            key={option.valeur}
            value={option.valeur}
            disabled={option.desactive}
            description={option.description}
          >
            {option.libelle}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
