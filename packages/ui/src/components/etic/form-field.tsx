import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "cn"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@etic-ui/components/ui/field"
import { Input } from "@etic-ui/components/ui/input"
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
} from "@etic-ui/components/ui/input-group"
import { NativeSelect } from "@etic-ui/components/ui/native-select"
import { Textarea } from "@etic-ui/components/ui/textarea"
import {
  FormFieldContext,
  type FormFieldContexte,
} from "@etic-ui/components/etic/form-field-context"

/** Astérisque d'un champ obligatoire, masqué aux lecteurs d'écran : ils
 *  annoncent le `required` (ou `aria-required`) du contrôle, que `FormField`
 *  pose quand il est `obligatoire`. */
export function RequiredMark({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="required-mark"
      aria-hidden="true"
      title="Champ obligatoire"
      className={cn("text-destructive", className)}
      {...props}
    >
      *
    </span>
  )
}

/** Attributs posés sur l'enfant direct par `FormField`. */
export interface FormFieldControleProps {
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  required?: boolean
  "aria-required"?: boolean
}

/** Champs de saisie natifs, ou primitives shadcn qui en rendent un : seuls à
 *  recevoir un vrai `required` de `FormField`. */
const CHAMPS_NATIFS = new Set<unknown>([
  "input",
  "textarea",
  "select",
  Input,
  Textarea,
  NativeSelect,
  InputGroupInput,
  InputGroupTextarea,
])

/** Champ de saisie d'un `InputGroup` (suffixe, bouton…) : c'est lui, et non
 *  l'enveloppe, que vise le libellé. */
const CHAMPS_DE_GROUPE = new Set<unknown>([
  "input",
  "textarea",
  InputGroupInput,
  InputGroupTextarea,
])

type Controle = ReactElement<FormFieldControleProps>

function champDuGroupe(groupe: ReactElement): Controle | undefined {
  const { children } = groupe.props as { children?: ReactNode }
  return Children.toArray(children).find(
    (enfant): enfant is Controle =>
      isValidElement(enfant) && CHAMPS_DE_GROUPE.has(enfant.type)
  )
}

/** Pose `attributs` sur le contrôle ; dans un `InputGroup`, sur son champ. */
function relier(
  controle: Controle,
  dansGroupe: boolean,
  attributs: FormFieldControleProps
) {
  if (!dansGroupe) return cloneElement(controle, attributs)
  let fait = false
  const { children } = controle.props as { children?: ReactNode }
  return cloneElement(
    controle as ReactElement<{ children?: ReactNode }>,
    {},
    Children.map(children, (enfant) => {
      if (fait || !isValidElement(enfant) || !CHAMPS_DE_GROUPE.has(enfant.type))
        return enfant
      fait = true
      return cloneElement(enfant as Controle, attributs)
    })
  )
}

export interface FormFieldProps extends Omit<
  ComponentProps<typeof Field>,
  "children"
> {
  libelle: ReactNode
  /** Affiche l'astérisque et rend le contrôle requis (voir `FormField`). */
  obligatoire?: boolean
  /** Ligne d'aide sous le contrôle. */
  description?: ReactNode
  /** Message d'erreur, ou plusieurs (un par ligne). Rend le champ invalide. */
  erreur?: ReactNode | string[]
  /** Identifiant du contrôle ; généré s'il manque. */
  id?: string
  /** Le contrôle (Input, Select…, ou tout composant qui transmet `id` et les
   *  attributs `aria-*` à son élément de saisie). */
  children: ReactElement<FormFieldControleProps>
}

/**
 * Un champ de formulaire complet : le `Field` de shadcn, avec libellé (et
 * astérisque si obligatoire), contrôle, aide et erreur, reliés par `htmlFor`,
 * `aria-describedby` et `aria-invalid` posés sur le contrôle.
 *
 * Un champ obligatoire rend le contrôle requis. Règle : un champ natif ou une
 * primitive shadcn de saisie (Input, Textarea, NativeSelect, champ
 * d'InputGroup) reçoit `required` ; tout autre enfant reçoit `aria-required`.
 * Un composite (DatePicker, PhoneInput, SearchSelect, ou un composant de
 * l'application) lit `useFormField()` et pose lui-même un vrai `required` sur
 * son élément de saisie, en ignorant ce `aria-required` ; un groupe
 * (CheckboxList, SegmentedControl) l'ignore aussi et se dit « obligatoire »
 * dans son nom. Autour d'un `InputGroup`, les attributs vont à son champ.
 */
export function FormField({
  libelle,
  obligatoire = false,
  description,
  erreur,
  id,
  children,
  ...props
}: FormFieldProps) {
  const genere = useId()
  // Autour d'un InputGroup, le libellé vise son champ de saisie.
  const champGroupe =
    children.type === InputGroup ? champDuGroupe(children) : undefined
  const cible = champGroupe ?? children
  const idControle = id ?? cible.props.id ?? genere
  const idLibelle = `${idControle}-libelle`
  const idDescription = `${idControle}-description`
  const idErreur = `${idControle}-erreur`
  const erreurs = Array.isArray(erreur)
    ? erreur.filter(Boolean).map((message) => ({ message }))
    : undefined
  const invalide = erreurs ? erreurs.length > 0 : Boolean(erreur)

  const decrit =
    [
      cible.props["aria-describedby"],
      description ? idDescription : null,
      invalide ? idErreur : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined

  const contexte: FormFieldContexte = {
    id: idControle,
    libelleId: idLibelle,
    descriptionId: description ? idDescription : undefined,
    erreurId: invalide ? idErreur : undefined,
    describedBy: decrit,
    obligatoire,
    invalide,
  }

  return (
    <Field data-invalid={invalide || undefined} {...props}>
      <FieldLabel id={idLibelle} htmlFor={idControle}>
        {libelle}
        {obligatoire ? <RequiredMark /> : null}
      </FieldLabel>
      <FormFieldContext.Provider value={contexte}>
        {relier(children, Boolean(champGroupe), {
          id: idControle,
          "aria-describedby": decrit,
          "aria-invalid": invalide || cible.props["aria-invalid"] || undefined,
          ...(obligatoire
            ? CHAMPS_NATIFS.has(cible.type)
              ? { required: true }
              : { "aria-required": true }
            : {}),
        })}
      </FormFieldContext.Provider>
      {description ? (
        <FieldDescription id={idDescription}>{description}</FieldDescription>
      ) : null}
      {/* Pas de `role="alert"` (shadcn) : cinq champs fautifs feraient cinq
          alertes, et une erreur affichée pendant la frappe la couperait.
          L'erreur est dans la description du contrôle. */}
      {invalide ? (
        erreurs ? (
          <FieldError id={idErreur} role={undefined} errors={erreurs} />
        ) : (
          <FieldError id={idErreur} role={undefined}>
            {erreur as ReactNode}
          </FieldError>
        )
      ) : null}
    </Field>
  )
}

export interface FormSectionProps extends Omit<
  ComponentProps<typeof FieldSet>,
  "title"
> {
  titre?: ReactNode
  description?: ReactNode
}

/**
 * Regroupe des champs sous un titre : `FieldSet` et `FieldLegend` de shadcn
 * (un `<fieldset>`, que les lecteurs d'écran annoncent avec son titre), les
 * champs espacés par `FieldGroup`.
 */
export function FormSection({
  titre,
  description,
  children,
  ...props
}: FormSectionProps) {
  return (
    <FieldSet {...props}>
      {titre ? <FieldLegend>{titre}</FieldLegend> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldGroup>{children}</FieldGroup>
    </FieldSet>
  )
}
