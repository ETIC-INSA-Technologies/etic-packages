import { createContext, useContext } from "react"

/** Ce que `FormField` sait de son champ, pour le contrôle qu'il contient. */
export interface FormFieldContexte {
  /** Identifiant du contrôle (cible du libellé). */
  id: string
  /** Identifiant du libellé : un groupe (cases, boutons joints), qu'un
   *  `<label for>` ne nomme pas, le cite dans `aria-labelledby`. */
  libelleId: string
  /** Identifiant de l'aide, si le champ en a une. */
  descriptionId?: string
  /** Identifiant du message d'erreur, s'il est affiché. */
  erreurId?: string
  /** Valeur d'`aria-describedby` : aide et erreur. */
  describedBy?: string
  obligatoire: boolean
  invalide: boolean
}

export const FormFieldContext = createContext<FormFieldContexte | null>(null)

/**
 * Le champ (`FormField`) qui entoure le composant, ou `null` hors d'un champ.
 * Un contrôle composite y lit de quoi poser `id`, `aria-describedby`,
 * `aria-invalid` et `required` sur son vrai élément de saisie, comme le
 * `useFormField()` du Form de shadcn.
 */
export function useFormField(): FormFieldContexte | null {
  return useContext(FormFieldContext)
}

/** Attributs explicites d'un groupe, prioritaires sur ceux du champ. */
interface AttributsDeGroupe {
  required?: boolean
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling"
}

/**
 * Attributs d'un groupe de contrôles (cases, boutons joints) : `role="group"`
 * n'admet pas `aria-required`, et un `<label for>` ne le nomme pas. Le
 * groupe cite donc le libellé du champ (`aria-labelledby`), et un groupe
 * obligatoire cite aussi `idMention`, un élément masqué « obligatoire » que
 * le composant rend : son nom devient « Groupes obligatoire ». Sans libellé à
 * citer (`aria-label`), la mention passe dans la description.
 */
export function attributsDuGroupe(
  champ: FormFieldContexte | null,
  props: AttributsDeGroupe,
  idMention: string
) {
  const obligatoire = props.required ?? champ?.obligatoire ?? false
  const nom = props["aria-labelledby"] ?? champ?.libelleId
  const mention = obligatoire ? idMention : undefined
  return {
    obligatoire,
    attributs: {
      "aria-labelledby": nom
        ? [nom, mention].filter(Boolean).join(" ")
        : undefined,
      "aria-describedby":
        [props["aria-describedby"] ?? champ?.describedBy, nom ? null : mention]
          .filter(Boolean)
          .join(" ") || undefined,
      "aria-invalid": props["aria-invalid"] ?? (champ?.invalide || undefined),
    },
  }
}

/** Attributs explicites d'un contrôle, prioritaires sur ceux du champ. */
interface AttributsExplicites {
  id?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling"
  required?: boolean
}

/**
 * Attributs du vrai élément de saisie d'un composite : ceux qu'il reçoit,
 * sinon ceux du champ. Le `aria-required` posé par `FormField` sur le
 * composite est ignoré : son élément de saisie porte un vrai `required`.
 */
export function attributsDuChamp(
  champ: FormFieldContexte | null,
  props: AttributsExplicites
) {
  return {
    id: props.id ?? champ?.id,
    "aria-describedby": props["aria-describedby"] ?? champ?.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (champ?.invalide || undefined),
    required: props.required ?? (champ?.obligatoire || undefined),
  }
}
