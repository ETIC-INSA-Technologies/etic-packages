import { useMemo, useState, type ComponentProps } from "react"
import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"
import exemples from "libphonenumber-js/mobile/examples"

import { Button } from "@etic-ui/components/ui/button"
import { ButtonGroup } from "@etic-ui/components/ui/button-group"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@etic-ui/components/ui/combobox"
import { Input } from "@etic-ui/components/ui/input"
import {
  attributsDuChamp,
  useFormField,
} from "@etic-ui/components/etic/form-field-context"

interface OptionPays {
  value: CountryCode
  /** « France +33 » : ce que la recherche lit. */
  label: string
}

export type { CountryCode }

export interface PhoneInputDetails {
  /** Numéro complet et plausible pour son pays (longueur, préfixes). */
  valide: boolean
  /** Pays sélectionné, ou reconnu dans un numéro tapé avec « + ». */
  pays: CountryCode
}

export interface PhoneInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange"
> {
  /** Numéro au format E.164 (« +33612345678 »), ou "" s'il n'y en a pas. */
  valeur: string
  /** Reçoit le numéro en E.164 dès qu'il a une longueur possible ; sinon le
   *  texte tapé (et `valide` à faux) ; "" si le champ est vide. */
  onValeurChange: (valeur: string, details: PhoneInputDetails) => void
  /** Pays proposé tant que le numéro n'en indique pas d'autre. */
  paysParDefaut?: CountryCode
  /** Pays proposés dans la liste ; tous par défaut. */
  pays?: CountryCode[]
}

/** Drapeau en emoji, à partir des deux lettres du pays. */
function drapeau(pays: CountryCode) {
  return String.fromCodePoint(
    ...[...pays].map((lettre) => 0x1f1e6 + lettre.charCodeAt(0) - 65)
  )
}

// Tous les pays, triés par leur nom à la française : calculés une fois, au
// premier rendu d'un PhoneInput, puis filtrés par instance.
let tousLesPays: OptionPays[] | undefined

function listePays(): OptionPays[] {
  if (!tousLesPays) {
    const noms = new Intl.DisplayNames(["fr"], { type: "region" })
    // Tri sur le nom seul : « Saint-Martin » avant « Saint-Martin (partie
    // néerlandaise) », quel que soit l'indicatif.
    const ordre = new Intl.Collator("fr")
    tousLesPays = getCountries()
      .map((code) => ({ code, nom: noms.of(code) ?? code }))
      .sort((a, b) => ordre.compare(a.nom, b.nom))
      .map(({ code, nom }) => ({
        value: code,
        label: `${nom} +${getCountryCallingCode(code)}`,
      }))
  }
  return tousLesPays
}

function lire(texte: string, pays: CountryCode) {
  return parsePhoneNumberFromString(texte, pays)
}

function enTexte(valeur: string, pays: CountryCode) {
  const numero = valeur ? lire(valeur, pays) : undefined
  if (!numero) return { texte: valeur, pays }
  const paysNumero = numero.country ?? pays
  return { texte: numero.formatNational(), pays: paysNumero }
}

/**
 * Numéro de téléphone avec sélecteur de pays (Combobox de shadcn : drapeau et
 * indicatif, recherche sur le nom du pays ou l'indicatif) : lu, validé et mis
 * en forme par libphonenumber-js, rendu en E.164. Le numéro se tape
 * librement ; il est mis en forme en quittant le champ. Un numéro tapé avec
 * son indicatif (« +44… ») choisit le pays.
 *
 * `className` va à l'enveloppe (`ButtonGroup`), le reste au champ du numéro ;
 * avec `name`, un champ caché soumet la valeur (E.164), pas le texte affiché.
 */
export function PhoneInput({
  valeur,
  onValeurChange,
  paysParDefaut = "FR",
  pays: paysProposes,
  disabled,
  className,
  onBlur,
  placeholder,
  id,
  name,
  form,
  required,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  ...props
}: PhoneInputProps) {
  const champ = attributsDuChamp(useFormField(), {
    id,
    required,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  })
  const [etat, setEtat] = useState(() => enTexte(valeur, paysParDefaut))
  // Dernière valeur vue (reçue ou émise) : une autre valeur, venue de
  // l'application, remplace la saisie.
  const [valeurVue, setValeurVue] = useState(valeur)
  if (valeur !== valeurVue) {
    setValeurVue(valeur)
    setEtat(enTexte(valeur, etat.pays))
  }

  // Clé stable : un tableau `pays` écrit en ligne ne refait pas le filtre.
  const clePays = paysProposes?.join(",")
  const options = useMemo<OptionPays[]>(() => {
    const retenus = clePays ? new Set(clePays.split(",")) : undefined
    return retenus
      ? listePays().filter((option) => retenus.has(option.value))
      : listePays()
  }, [clePays])

  function emettre(texte: string, pays: CountryCode) {
    const numero = texte.trim() ? lire(texte, pays) : undefined
    // Un numéro international désigne son pays : la liste le suit.
    const paysRetenu =
      texte.trim().startsWith("+") && numero?.country ? numero.country : pays
    // Un numéro incomplet n'a pas d'écriture E.164 fiable (« 06 1 » donnerait
    // « +33061 ») : on rend alors le texte tapé.
    const sortie = numero?.isPossible() ? numero.number : texte.trim()
    setEtat({ texte, pays: paysRetenu })
    setValeurVue(sortie)
    if (sortie !== valeur || paysRetenu !== etat.pays)
      onValeurChange(sortie, {
        valide: numero?.isValid() ?? false,
        pays: paysRetenu,
      })
  }

  return (
    <>
      <ButtonGroup className={className}>
        <Combobox<OptionPays>
          items={options}
          value={options.find((option) => option.value === etat.pays) ?? null}
          isItemEqualToValue={(a, b) => a.value === b.value}
          // La recherche surligne le premier pays trouvé : Entrée le choisit.
          autoHighlight
          onValueChange={(option) => {
            if (!option) return
            // Le numéro national prend l'écriture du nouveau pays (« 04 70 12
            // 34 56 » devient « 0470 12 34 56 » en Belgique) ; un numéro
            // international garde son pays, et sa saisie.
            const numero = etat.texte.trim().startsWith("+")
              ? undefined
              : lire(etat.texte, option.value)
            emettre(
              numero?.isValid() ? numero.formatNational() : etat.texte,
              option.value
            )
          }}
          disabled={disabled}
        >
          <ComboboxTrigger
            render={
              // 16 px sous md comme le champ : pas de zoom d'iOS, ni de tailles
              // mêlées dans la ligne.
              <Button
                variant="outline"
                aria-label="Pays"
                className="text-base md:text-sm"
              />
            }
          >
            <ComboboxValue>
              {(option: OptionPays | null) =>
                option
                  ? `${drapeau(option.value)} +${getCountryCallingCode(option.value)}`
                  : null
              }
            </ComboboxValue>
          </ComboboxTrigger>
          <ComboboxContent className="w-72">
            <ComboboxInput
              showTrigger={false}
              placeholder="Pays ou indicatif"
              aria-label="Rechercher un pays"
            />
            <ComboboxEmpty>Aucun pays trouvé.</ComboboxEmpty>
            <ComboboxList>
              {(option: OptionPays) => (
                <ComboboxItem key={option.value} value={option}>
                  <span aria-hidden="true">{drapeau(option.value)}</span>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          {...props}
          {...champ}
          form={form}
          // Le `aria-required` posé par FormField cède au vrai `required`.
          aria-required={undefined}
          disabled={disabled}
          placeholder={
            placeholder ??
            getExampleNumber(etat.pays, exemples)?.formatNational()
          }
          value={etat.texte}
          onChange={(event) => emettre(event.target.value, etat.pays)}
          onBlur={(event) => {
            const numero = lire(etat.texte, etat.pays)
            if (numero?.isValid())
              setEtat({ texte: numero.formatNational(), pays: etat.pays })
            onBlur?.(event)
          }}
        />
      </ButtonGroup>
      {/* Hors du ButtonGroup, dont les arrondis suivent :first-child et
        :last-child. */}
      {name ? (
        <input
          type="hidden"
          name={name}
          form={form}
          disabled={disabled}
          value={valeur}
        />
      ) : null}
    </>
  )
}
